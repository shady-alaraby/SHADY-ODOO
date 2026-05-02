import { Router, type IRouter } from "express";
import { db, activitiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middlewares/auth.js";
import { ListActivitiesQueryParams, CreateActivityBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/activities", authMiddleware, async (req, res) => {
  try {
    const params = ListActivitiesQueryParams.parse(req.query);
    const conditions = [];
    if (params.ticketId) conditions.push(eq(activitiesTable.ticketId, params.ticketId));
    if (params.userId) conditions.push(eq(activitiesTable.userId, params.userId));

    const activities = conditions.length > 0
      ? await db.select().from(activitiesTable).where(and(...conditions))
      : await db.select().from(activitiesTable);

    res.json(activities);
  } catch (err) {
    req.log.error({ err }, "List activities error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/activities", authMiddleware, async (req, res) => {
  try {
    const body = CreateActivityBody.parse(req.body);
    const [activity] = await db.insert(activitiesTable).values({
      ticketId: body.ticketId,
      userId: req.user!.userId,
      type: body.type,
      summary: body.summary ?? null,
      internalOnly: true,
      doneAt: body.doneAt,
    }).returning();
    res.status(201).json(activity);
  } catch (err) {
    req.log.error({ err }, "Create activity error");
    res.status(400).json({ error: "Bad request" });
  }
});

export default router;
