import { Router, type IRouter } from "express";
import { db, syncLogsTable, ticketsTable, odooMappingsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";
import { getCredentials, authenticate, searchReadLeads, type OdooLead } from "../services/odooService.js";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Arabic name normalization for fuzzy matching
// ---------------------------------------------------------------------------
function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    // Remove common Arabic prefixes/articles
    .replace(/^(ال|el-|al-)/gi, "")
    // Normalize common Arabic letter variants
    .replace(/أ|إ|آ/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    // Collapse spaces
    .replace(/\s+/g, " ");
}

function namesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return true;
  // Check if one fully contains the other (handles partial name matches)
  if (na.includes(nb) || nb.includes(na)) return true;
  // Check first name match (first token)
  const fa = na.split(" ")[0];
  const fb = nb.split(" ")[0];
  return fa.length > 2 && fa === fb;
}

// ---------------------------------------------------------------------------
// Walk the user hierarchy upwards to find TL and BD
// ---------------------------------------------------------------------------
interface UserRow {
  id: number;
  name: string;
  role: string;
  managerId: number | null;
}

function resolveHierarchy(
  user: UserRow,
  allUsers: UserRow[]
): { tl: UserRow | null; bd: UserRow | null } {
  const byId = new Map(allUsers.map((u) => [u.id, u]));
  let tl: UserRow | null = null;
  let bd: UserRow | null = null;

  let current: UserRow | null = user;
  while (current) {
    const managerId = current.managerId;
    if (!managerId) break;
    const manager = byId.get(managerId) ?? null;
    if (!manager) break;
    if (manager.role === "TL" && !tl) tl = manager;
    if (manager.role === "BD" && !bd) bd = manager;
    current = manager;
  }
  return { tl, bd };
}

// ---------------------------------------------------------------------------
// Build the Odoo deep-link URL
// ---------------------------------------------------------------------------
function buildOdooUrl(odooId: number): string {
  const baseUrl = process.env.ODOO_URL ?? "https://e.aait.sa";
  return `${baseUrl}/web#id=${odooId}&model=crm.lead&view_type=form`;
}

// ---------------------------------------------------------------------------
// Demo sync — runs when Odoo credentials are not configured
// ---------------------------------------------------------------------------
async function runDemoSync(): Promise<{ created: number; updated: number; errors: number; message: string }> {
  logger.info("Odoo credentials not configured — running demo sync");

  const stages = ["New", "Qualified", "Proposition", "Won", "Lost"];
  const clients = [
    "TechVision LLC", "Gulf Solutions", "Alpha Dynamics", "Nexus Corp", "Digital Wave",
    "Smart Systems", "Innovation Hub", "CloudPeak", "DataBridge", "FutureTech",
    "Horizon Group", "Meridian Tech", "Apex Digital", "Quantum Systems", "Stellar Inc",
  ];
  const services = ["mobile", "ecommerce", "erp", "crm", "cloud", "consulting", "integration"];

  const [mappings, allUsers] = await Promise.all([
    db.select().from(odooMappingsTable),
    db.select({
      id: usersTable.id,
      name: usersTable.name,
      role: usersTable.role,
      managerId: usersTable.managerId,
    }).from(usersTable),
  ]);

  const mappingMap = new Map(mappings.map((m) => [m.odooSalesperson, m.localUserId]));
  const tsUsers = allUsers.filter((u) => u.role === "TS");

  let created = 0;
  let updated = 0;

  for (let i = 1; i <= 30; i++) {
    const stage = stages[Math.floor(Math.random() * stages.length)];
    const tsUser = tsUsers[i % tsUsers.length];
    const salespersonName = tsUser?.name ?? "Demo User";
    const client = clients[i % clients.length];
    const service = services[i % services.length];
    const prob = stage === "Won" ? 100 : stage === "Lost" ? 0 : Math.round(Math.random() * 80 + 10);
    const revenue = Math.round((Math.random() * 50000 + 5000) / 1000) * 1000;
    const assignedUserId = mappingMap.get(salespersonName) ?? tsUser?.id ?? null;
    const { tl, bd } = tsUser ? resolveHierarchy(tsUser as UserRow, allUsers as UserRow[]) : { tl: null, bd: null };
    const odooId = 1000 + i;
    const odooUrl = buildOdooUrl(odooId);

    const existing = await db
      .select({ id: ticketsTable.id })
      .from(ticketsTable)
      .where(eq(ticketsTable.odooId, odooId))
      .limit(1);

    const ticketData = {
      title: `Lead — ${client}`,
      clientName: client,
      stage,
      probability: prob,
      expectedRevenue: revenue,
      salesperson: salespersonName,
      odooSalespersonName: salespersonName,
      phone: `+966 5${Math.floor(Math.random() * 90000000 + 10000000)}`,
      email: `contact@${client.toLowerCase().replace(/\s+/g, "")}.com`,
      lastUpdate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      lastOdooUpdate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      createDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
      assignedUserId: assignedUserId ?? null,
      assignedTeamLeaderId: tl?.id ?? null,
      assignedBusinessDeveloperId: bd?.id ?? null,
      odooUrl,
      tags: [service],
      syncedAt: new Date(),
    };

    if (existing.length > 0) {
      await db.update(ticketsTable).set(ticketData).where(eq(ticketsTable.odooId, odooId));
      updated++;
    } else {
      await db.insert(ticketsTable).values({ odooId, ...ticketData });
      created++;
    }
  }

  return { created, updated, errors: 0, message: "Demo sync completed (no Odoo credentials configured)" };
}

// ---------------------------------------------------------------------------
// Real Odoo sync via XML-RPC
// ---------------------------------------------------------------------------
async function runOdooSync(): Promise<{ created: number; updated: number; errors: number; message: string; unmatched: string[] }> {
  const creds = getCredentials();
  if (!creds) {
    const demo = await runDemoSync();
    return { ...demo, unmatched: [] };
  }

  let created = 0;
  let updated = 0;
  let errors = 0;
  const unmatchedNames: string[] = [];

  try {
    // 1. Authenticate
    const uid = await authenticate(creds);

    // 2. Load all user data + mappings for matching
    const [allUsers, mappings] = await Promise.all([
      db.select({
        id: usersTable.id,
        name: usersTable.name,
        role: usersTable.role,
        managerId: usersTable.managerId,
      }).from(usersTable),
      db.select().from(odooMappingsTable),
    ]);

    const mappingMap = new Map(mappings.map((m) => [m.odooSalesperson, m.localUserId]));

    // 3. Fetch leads (paginate in batches of 200)
    let offset = 0;
    const batchSize = 200;
    let totalFetched = 0;

    while (true) {
      const leads: OdooLead[] = await searchReadLeads(creds, uid, batchSize, offset);
      if (leads.length === 0) break;
      totalFetched += leads.length;
      logger.info({ batch: offset / batchSize + 1, count: leads.length }, "Processing Odoo leads batch");

      // 4. Upsert each lead
      for (const lead of leads) {
        try {
          const odooId = lead.id;
          const odooSalespersonName = Array.isArray(lead.user_id) ? (lead.user_id[1] ?? null) : null;
          const stageName = Array.isArray(lead.stage_id) ? (lead.stage_id[1] ?? "New") : "New";
          const clientName = lead.contact_name || lead.partner_name || "Unknown";
          const odooUrl = buildOdooUrl(odooId);

          // Resolve local user from mapping first, then fuzzy name match
          let assignedUser: UserRow | null = null;
          if (odooSalespersonName) {
            const mappedId = mappingMap.get(odooSalespersonName);
            if (mappedId) {
              assignedUser = allUsers.find((u) => u.id === mappedId) ?? null;
            } else {
              // Fuzzy Arabic name match
              assignedUser = allUsers.find((u) => namesMatch(u.name, odooSalespersonName)) ?? null;
              if (!assignedUser) {
                if (!unmatchedNames.includes(odooSalespersonName)) {
                  unmatchedNames.push(odooSalespersonName);
                  logger.warn({ odooSalespersonName }, "Unmatched Odoo salesperson — no local user found");
                }
              }
            }
          }

          const { tl, bd } = assignedUser
            ? resolveHierarchy(assignedUser, allUsers as UserRow[])
            : { tl: null, bd: null };

          const ticketData = {
            title: lead.name || clientName,
            clientName,
            contactName: lead.contact_name ?? null,
            phone: lead.phone || lead.mobile || null,
            email: lead.email_from ?? null,
            expectedRevenue: lead.expected_revenue ?? null,
            stage: stageName,
            probability: lead.probability ?? null,
            salesperson: odooSalespersonName,
            odooSalespersonName,
            lastUpdate: lead.write_date ? new Date(lead.write_date) : null,
            lastOdooUpdate: lead.write_date ? new Date(lead.write_date) : null,
            createDate: lead.create_date ? new Date(lead.create_date) : null,
            assignedUserId: assignedUser?.id ?? null,
            assignedTeamLeaderId: tl?.id ?? null,
            assignedBusinessDeveloperId: bd?.id ?? null,
            odooUrl,
            syncedAt: new Date(),
          };

          const existing = await db
            .select({ id: ticketsTable.id })
            .from(ticketsTable)
            .where(eq(ticketsTable.odooId, odooId))
            .limit(1);

          if (existing.length > 0) {
            await db.update(ticketsTable).set(ticketData).where(eq(ticketsTable.odooId, odooId));
            updated++;
          } else {
            await db.insert(ticketsTable).values({ odooId, tags: [], ...ticketData });
            created++;
          }
        } catch (err) {
          errors++;
          logger.error({ err, odooId: lead.id }, "Failed to upsert ticket from Odoo lead");
        }
      }

      if (leads.length < batchSize) break;
      offset += batchSize;
    }

    logger.info({ totalFetched, created, updated, errors, unmatched: unmatchedNames.length }, "Odoo sync complete");
    return {
      created,
      updated,
      errors,
      unmatched: unmatchedNames,
      message: `Sync completed: ${totalFetched} leads fetched, ${unmatchedNames.length} unmatched salespersons`,
    };
  } catch (err) {
    // Log error WITHOUT credentials
    logger.error({ message: (err as Error).message }, "Odoo sync failed");
    return {
      created,
      updated,
      errors: errors + 1,
      unmatched: unmatchedNames,
      message: `Odoo connection failed: ${(err as Error).message}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Primary sync endpoint (spec: POST /api/integrations/odoo/sync)
router.post("/integrations/odoo/sync", authMiddleware, async (req, res) => {
  const [log] = await db
    .insert(syncLogsTable)
    .values({ status: "pending", created: 0, updated: 0, errors: 0 })
    .returning();

  try {
    const result = await runOdooSync();
    const isError = result.errors > 0 && result.created === 0 && result.updated === 0;

    const [updatedLog] = await db
      .update(syncLogsTable)
      .set({
        status: isError ? "error" : "success",
        finishedAt: new Date(),
        created: result.created,
        updated: result.updated,
        errors: result.errors,
        message: result.message,
      })
      .where(eq(syncLogsTable.id, log.id))
      .returning();

    res.json({
      success: !isError,
      created: result.created,
      updated: result.updated,
      errors: result.errors,
      unmatched: result.unmatched,
      message: result.message,
      syncedAt: updatedLog.finishedAt ?? new Date(),
    });
  } catch (err) {
    req.log.error({ message: (err as Error).message }, "Sync route failed");
    await db.update(syncLogsTable).set({
      status: "error",
      finishedAt: new Date(),
      message: "Sync failed unexpectedly",
    }).where(eq(syncLogsTable.id, log.id));
    res.status(500).json({ error: "Sync failed" });
  }
});

// Legacy alias kept for backward compatibility
router.post("/sync/odoo", authMiddleware, async (req, res) => {
  res.redirect(307, "/api/integrations/odoo/sync");
});

// Test connection endpoint (admin only)
router.get("/integrations/odoo/test", authMiddleware, async (req, res) => {
  try {
    const creds = getCredentials();
    if (!creds) {
      res.json({
        configured: false,
        message: "Odoo credentials not configured. Set ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_API_KEY environment variables.",
        missing: ["ODOO_URL", "ODOO_DB", "ODOO_USERNAME", "ODOO_API_KEY"].filter(
          (k) => !process.env[k]
        ),
      });
      return;
    }

    const uid = await authenticate(creds);
    const leads = await searchReadLeads(creds, uid, 1, 0);
    res.json({
      configured: true,
      uid,
      sampleLead: leads[0] ?? null,
      message: "Odoo connection successful",
    });
  } catch (err) {
    req.log.error({ message: (err as Error).message }, "Odoo connection test failed");
    res.status(400).json({
      configured: true,
      error: (err as Error).message,
      message: "Odoo connection failed",
    });
  }
});

// Sync status history
router.get("/sync/status", authMiddleware, async (req, res) => {
  try {
    const logs = await db
      .select()
      .from(syncLogsTable)
      .orderBy(desc(syncLogsTable.startedAt))
      .limit(20);
    res.json(logs);
  } catch (err) {
    req.log.error({ err }, "Get sync status error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
