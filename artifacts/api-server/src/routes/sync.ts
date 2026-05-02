import { Router, type IRouter } from "express";
import { db, syncLogsTable, ticketsTable, odooMappingsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

async function runOdooSync(): Promise<{ created: number; updated: number; errors: number; message: string }> {
  const odooUrl = process.env.ODOO_URL;
  const odooDb = process.env.ODOO_DB;
  const odooUsername = process.env.ODOO_USERNAME;
  const odooApiKey = process.env.ODOO_API_KEY;

  if (!odooUrl || !odooDb || !odooUsername || !odooApiKey) {
    // Demo mode: generate synthetic data so the app is usable without real Odoo
    logger.info("Odoo credentials not configured — running demo sync");
    const stages = ["New", "Qualified", "Proposition", "Won", "Lost"];
    const salespersons = ["Ahmed Al-Hassan", "Sara Mohammed", "Khalid Ibrahim", "Layla Nasser", "Omar Farouq"];
    const clients = [
      "TechVision LLC", "Gulf Solutions", "Alpha Dynamics", "Nexus Corp", "Digital Wave",
      "Smart Systems", "Innovation Hub", "CloudPeak", "DataBridge", "FutureTech",
      "Horizon Group", "Meridian Tech", "Apex Digital", "Quantum Systems", "Stellar Inc",
    ];
    const services = ["mobile", "ecommerce", "erp", "crm", "cloud", "consulting", "integration"];

    let created = 0;
    let updated = 0;

    const [mappings, users] = await Promise.all([
      db.select().from(odooMappingsTable),
      db.select().from(usersTable),
    ]);

    const mappingMap = new Map(mappings.map(m => [m.odooSalesperson, m.localUserId]));

    for (let i = 1; i <= 30; i++) {
      const stage = stages[Math.floor(Math.random() * stages.length)];
      const salesperson = salespersons[Math.floor(Math.random() * salespersons.length)];
      const client = clients[i % clients.length];
      const service = services[Math.floor(Math.random() * services.length)];
      const prob = stage === "Won" ? 100 : stage === "Lost" ? 0 : Math.round(Math.random() * 80 + 10);
      const revenue = Math.round((Math.random() * 50000 + 5000) / 1000) * 1000;

      const assignedUserId = mappingMap.get(salesperson) ?? (users.length > 0 ? users[i % users.length]?.id ?? null : null);

      const existing = await db.select({ id: ticketsTable.id }).from(ticketsTable).where(eq(ticketsTable.odooId, 1000 + i)).limit(1);

      if (existing.length > 0) {
        await db.update(ticketsTable).set({
          stage,
          probability: prob,
          expectedRevenue: revenue,
          salesperson,
          lastUpdate: new Date(),
          syncedAt: new Date(),
          assignedUserId: assignedUserId ?? null,
          tags: [service],
        }).where(eq(ticketsTable.odooId, 1000 + i));
        updated++;
      } else {
        await db.insert(ticketsTable).values({
          odooId: 1000 + i,
          clientName: client,
          phone: `+966 5${Math.floor(Math.random() * 90000000 + 10000000)}`,
          email: `contact@${client.toLowerCase().replace(/\s+/g, "")}.com`,
          expectedRevenue: revenue,
          stage,
          probability: prob,
          salesperson,
          lastUpdate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          createDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
          assignedUserId: assignedUserId ?? null,
          tags: [service],
          syncedAt: new Date(),
        });
        created++;
      }
    }

    return { created, updated, errors: 0, message: "Demo sync completed (no Odoo credentials configured)" };
  }

  // Real Odoo sync via JSON-RPC
  let created = 0;
  let updated = 0;
  let errors = 0;

  try {
    // Authenticate
    const authRes = await fetch(`${odooUrl}/web/dataset/call_kw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: {
          model: "crm.lead",
          method: "search_read",
          args: [[]],
          kwargs: {
            fields: ["id", "partner_name", "phone", "email_from", "expected_revenue", "stage_id", "probability", "user_id", "write_date", "create_date"],
            limit: 200,
          },
        },
      }),
    });

    const authData = await authRes.json() as { result?: unknown[] };
    const leads = authData.result ?? [];

    const [mappings] = await Promise.all([
      db.select().from(odooMappingsTable),
    ]);
    const mappingMap = new Map(mappings.map(m => [m.odooSalesperson, m.localUserId]));

    for (const lead of leads as Record<string, unknown>[]) {
      try {
        const odooId = lead.id as number;
        const salesperson = (lead.user_id as [number, string])?.[1] ?? null;
        const stage = (lead.stage_id as [number, string])?.[1] ?? "New";
        const assignedUserId = salesperson ? (mappingMap.get(salesperson) ?? null) : null;

        const existing = await db.select({ id: ticketsTable.id }).from(ticketsTable).where(eq(ticketsTable.odooId, odooId)).limit(1);

        const ticketData = {
          clientName: (lead.partner_name as string) ?? "Unknown",
          phone: (lead.phone as string) ?? null,
          email: (lead.email_from as string) ?? null,
          expectedRevenue: (lead.expected_revenue as number) ?? null,
          stage,
          probability: (lead.probability as number) ?? null,
          salesperson,
          lastUpdate: lead.write_date ? new Date(lead.write_date as string) : null,
          createDate: lead.create_date ? new Date(lead.create_date as string) : null,
          assignedUserId,
          syncedAt: new Date(),
        };

        if (existing.length > 0) {
          await db.update(ticketsTable).set(ticketData).where(eq(ticketsTable.odooId, odooId));
          updated++;
        } else {
          await db.insert(ticketsTable).values({ odooId, ...ticketData, tags: [] });
          created++;
        }
      } catch {
        errors++;
      }
    }
  } catch (err) {
    logger.error({ err }, "Odoo sync error");
    return { created, updated, errors: errors + 1, message: "Odoo connection failed" };
  }

  return { created, updated, errors, message: "Sync completed successfully" };
}

router.post("/sync/odoo", authMiddleware, async (req, res) => {
  const [log] = await db.insert(syncLogsTable).values({
    status: "pending",
    created: 0,
    updated: 0,
    errors: 0,
  }).returning();

  try {
    const result = await runOdooSync();

    const [updated] = await db.update(syncLogsTable).set({
      status: result.errors > 0 && result.created === 0 && result.updated === 0 ? "error" : "success",
      finishedAt: new Date(),
      created: result.created,
      updated: result.updated,
      errors: result.errors,
      message: result.message,
    }).where(eq(syncLogsTable.id, log.id)).returning();

    res.json({
      success: true,
      created: result.created,
      updated: result.updated,
      errors: result.errors,
      message: result.message,
      syncedAt: updated.finishedAt ?? new Date(),
    });
  } catch (err) {
    req.log.error({ err }, "Sync failed");
    await db.update(syncLogsTable).set({
      status: "error",
      finishedAt: new Date(),
      message: "Sync failed with an unexpected error",
    }).where(eq(syncLogsTable.id, log.id));
    res.status(500).json({ error: "Sync failed" });
  }
});

router.get("/sync/status", authMiddleware, async (req, res) => {
  try {
    const logs = await db.select().from(syncLogsTable).orderBy(desc(syncLogsTable.startedAt)).limit(20);
    res.json(logs);
  } catch (err) {
    req.log.error({ err }, "Get sync status error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
