import { Router, type IRouter } from "express";
import { db, ticketsTable, usersTable, activitiesTable } from "@workspace/db";
import { eq, and, gte, ilike, or, sql } from "drizzle-orm";
import { authMiddleware } from "../middlewares/auth.js";
import { ListTicketsQueryParams, UpdateTicketBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tickets", authMiddleware, async (req, res) => {
  try {
    const params = ListTicketsQueryParams.parse(req.query);
    const conditions = [];

    if (params.stage) conditions.push(eq(ticketsTable.stage, params.stage));
    if (params.userId) conditions.push(eq(ticketsTable.assignedUserId, params.userId));
    if (params.minProbability !== undefined) conditions.push(gte(ticketsTable.probability, params.minProbability));
    if (params.search) {
      conditions.push(
        or(
          ilike(ticketsTable.clientName, `%${params.search}%`),
          ilike(ticketsTable.salesperson, `%${params.search}%`),
          ilike(ticketsTable.email, `%${params.search}%`)
        )
      );
    }

    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    const query = db.select().from(ticketsTable);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [tickets, countResult] = await Promise.all([
      whereClause
        ? query.where(whereClause).limit(limit).offset(offset)
        : query.limit(limit).offset(offset),
      whereClause
        ? db.select({ count: sql<number>`count(*)::int` }).from(ticketsTable).where(whereClause)
        : db.select({ count: sql<number>`count(*)::int` }).from(ticketsTable),
    ]);

    res.json({
      tickets,
      total: countResult[0]?.count ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    req.log.error({ err }, "List tickets error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/tickets/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    let assignedUser = null;
    if (ticket.assignedUserId) {
      const [u] = await db.select({
        id: usersTable.id,
        username: usersTable.username,
        name: usersTable.name,
        role: usersTable.role,
        managerId: usersTable.managerId,
        createdAt: usersTable.createdAt,
      }).from(usersTable).where(eq(usersTable.id, ticket.assignedUserId)).limit(1);
      assignedUser = u ?? null;
    }

    const activities = await db.select().from(activitiesTable).where(eq(activitiesTable.ticketId, id));

    res.json({ ...ticket, assignedUser, activities });
  } catch (err) {
    req.log.error({ err }, "Get ticket error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/tickets/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const body = UpdateTicketBody.parse(req.body);

    const updates: Record<string, unknown> = {};
    if (body.assignedUserId !== undefined) updates.assignedUserId = body.assignedUserId;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.internalNote !== undefined) updates.internalNote = body.internalNote;

    const [ticket] = await db.update(ticketsTable).set(updates).where(eq(ticketsTable.id, id)).returning();
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }
    res.json(ticket);
  } catch (err) {
    req.log.error({ err }, "Update ticket error");
    res.status(400).json({ error: "Bad request" });
  }
});

export default router;
