import { Router, type IRouter } from "express";
import { db, odooMappingsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middlewares/auth.js";
import { CreateMappingBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/mapping", authMiddleware, async (req, res) => {
  try {
    const mappings = await db.select({
      id: odooMappingsTable.id,
      odooSalesperson: odooMappingsTable.odooSalesperson,
      localUserId: odooMappingsTable.localUserId,
      createdAt: odooMappingsTable.createdAt,
      localUser: {
        id: usersTable.id,
        username: usersTable.username,
        name: usersTable.name,
        role: usersTable.role,
        managerId: usersTable.managerId,
        createdAt: usersTable.createdAt,
      },
    })
    .from(odooMappingsTable)
    .leftJoin(usersTable, eq(odooMappingsTable.localUserId, usersTable.id));
    res.json(mappings);
  } catch (err) {
    req.log.error({ err }, "List mappings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/mapping", authMiddleware, async (req, res) => {
  try {
    const body = CreateMappingBody.parse(req.body);
    const [mapping] = await db.insert(odooMappingsTable).values({
      odooSalesperson: body.odooSalesperson,
      localUserId: body.localUserId,
    }).returning();

    const [localUser] = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      name: usersTable.name,
      role: usersTable.role,
      managerId: usersTable.managerId,
      createdAt: usersTable.createdAt,
    }).from(usersTable).where(eq(usersTable.id, mapping.localUserId)).limit(1);

    res.status(201).json({ ...mapping, localUser: localUser ?? null });
  } catch (err) {
    req.log.error({ err }, "Create mapping error");
    res.status(400).json({ error: "Bad request" });
  }
});

export default router;
