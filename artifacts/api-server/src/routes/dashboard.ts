import { Router, type IRouter } from "express";
import { db, ticketsTable, usersTable } from "@workspace/db";
import { eq, sql, and, isNotNull } from "drizzle-orm";
import { authMiddleware } from "../middlewares/auth.js";
import { GetDashboardSummaryQueryParams, GetStageDistributionQueryParams, GetPerformanceByUserQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", authMiddleware, async (req, res) => {
  try {
    const params = GetDashboardSummaryQueryParams.parse(req.query);
    const condition = params.userId ? eq(ticketsTable.assignedUserId, params.userId) : undefined;

    const rows = condition
      ? await db.select().from(ticketsTable).where(condition)
      : await db.select().from(ticketsTable);

    const totalTickets = rows.length;
    const openTickets = rows.filter(r => r.stage !== "Won" && r.stage !== "Lost").length;
    const wonTickets = rows.filter(r => r.stage === "Won").length;
    const lostTickets = rows.filter(r => r.stage === "Lost").length;
    const totalPipelineValue = rows.reduce((sum, r) => sum + (r.expectedRevenue ?? 0), 0);
    const weightedRevenue = rows.reduce((sum, r) => sum + (r.expectedRevenue ?? 0) * ((r.probability ?? 0) / 100), 0);
    const avgProbability = rows.length > 0 ? rows.reduce((sum, r) => sum + (r.probability ?? 0), 0) / rows.length : 0;
    const conversionRate = totalTickets > 0 ? (wonTickets / totalTickets) * 100 : 0;

    res.json({
      totalPipelineValue,
      weightedRevenue,
      totalTickets,
      openTickets,
      wonTickets,
      lostTickets,
      avgProbability,
      conversionRate,
    });
  } catch (err) {
    req.log.error({ err }, "Dashboard summary error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/stage-distribution", authMiddleware, async (req, res) => {
  try {
    const params = GetStageDistributionQueryParams.parse(req.query);
    const condition = params.userId ? eq(ticketsTable.assignedUserId, params.userId) : undefined;

    const rows = condition
      ? await db.select().from(ticketsTable).where(condition)
      : await db.select().from(ticketsTable);

    const stageMap = new Map<string, { count: number; totalRevenue: number; totalProb: number }>();
    for (const row of rows) {
      const entry = stageMap.get(row.stage) ?? { count: 0, totalRevenue: 0, totalProb: 0 };
      entry.count++;
      entry.totalRevenue += row.expectedRevenue ?? 0;
      entry.totalProb += row.probability ?? 0;
      stageMap.set(row.stage, entry);
    }

    const stageOrder = ["New", "Qualified", "Proposition", "Won", "Lost"];
    const result = Array.from(stageMap.entries())
      .sort((a, b) => {
        const ai = stageOrder.indexOf(a[0]);
        const bi = stageOrder.indexOf(b[0]);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      })
      .map(([stage, data]) => ({
        stage,
        count: data.count,
        totalRevenue: data.totalRevenue,
        avgProbability: data.count > 0 ? data.totalProb / data.count : 0,
      }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Stage distribution error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/performance-by-user", authMiddleware, async (req, res) => {
  try {
    const params = GetPerformanceByUserQueryParams.parse(req.query);

    const tickets = await db.select().from(ticketsTable);
    const users = await db.select().from(usersTable);

    let filteredUsers = users;
    if (params.managerId) {
      filteredUsers = users.filter(u => u.managerId === params.managerId);
    }

    const userMap = new Map(users.map(u => [u.id, u]));

    const perfMap = new Map<string, {
      userId: number | null; userName: string; role: string | null;
      totalDeals: number; totalRevenue: number; weightedRevenue: number; wonDeals: number;
    }>();

    for (const ticket of tickets) {
      const userId = ticket.assignedUserId;
      const user = userId ? userMap.get(userId) : null;

      // Only show if filtering by managerId, include only that manager's team
      if (params.managerId && (!user || user.managerId !== params.managerId)) continue;

      const key = userId ? String(userId) : ticket.salesperson ?? "Unassigned";
      const entry = perfMap.get(key) ?? {
        userId,
        userName: user?.name ?? ticket.salesperson ?? "Unassigned",
        role: user?.role ?? null,
        totalDeals: 0,
        totalRevenue: 0,
        weightedRevenue: 0,
        wonDeals: 0,
      };
      entry.totalDeals++;
      entry.totalRevenue += ticket.expectedRevenue ?? 0;
      entry.weightedRevenue += (ticket.expectedRevenue ?? 0) * ((ticket.probability ?? 0) / 100);
      if (ticket.stage === "Won") entry.wonDeals++;
      perfMap.set(key, entry);
    }

    const result = Array.from(perfMap.values()).map(p => ({
      ...p,
      conversionRate: p.totalDeals > 0 ? (p.wonDeals / p.totalDeals) * 100 : 0,
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Performance by user error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/revenue-by-service", authMiddleware, async (req, res) => {
  try {
    const tickets = await db.select().from(ticketsTable);

    const serviceMap = new Map<string, { totalRevenue: number; count: number }>();

    for (const ticket of tickets) {
      const tags = (ticket.tags as string[]) ?? [];
      for (const tag of tags) {
        const entry = serviceMap.get(tag) ?? { totalRevenue: 0, count: 0 };
        entry.totalRevenue += ticket.expectedRevenue ?? 0;
        entry.count++;
        serviceMap.set(tag, entry);
      }
    }

    if (serviceMap.size === 0) {
      serviceMap.set("Untagged", { totalRevenue: tickets.reduce((s, t) => s + (t.expectedRevenue ?? 0), 0), count: tickets.length });
    }

    const result = Array.from(serviceMap.entries()).map(([service, data]) => ({
      service,
      totalRevenue: data.totalRevenue,
      count: data.count,
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Revenue by service error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/conversion-funnel", authMiddleware, async (req, res) => {
  try {
    const tickets = await db.select().from(ticketsTable);
    const stageOrder = ["New", "Qualified", "Proposition", "Won"];

    const stageCounts = new Map<string, number>();
    for (const ticket of tickets) {
      if (ticket.stage !== "Lost") {
        stageCounts.set(ticket.stage, (stageCounts.get(ticket.stage) ?? 0) + 1);
      }
    }

    const result = stageOrder.map((stage, i) => {
      const count = stageCounts.get(stage) ?? 0;
      const prevCount = i > 0 ? (stageCounts.get(stageOrder[i - 1]) ?? 0) : count;
      const dropOffRate = prevCount > 0 ? ((prevCount - count) / prevCount) * 100 : 0;
      const conversionRate = prevCount > 0 ? (count / prevCount) * 100 : 100;
      return { stage, count, dropOffRate: Math.max(0, dropOffRate), conversionRate: Math.min(100, conversionRate) };
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Conversion funnel error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
