import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middlewares/auth.js";
import { CreateUserBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users", authMiddleware, async (req, res) => {
  try {
    const users = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      name: usersTable.name,
      role: usersTable.role,
      managerId: usersTable.managerId,
      createdAt: usersTable.createdAt,
    }).from(usersTable);
    res.json(users);
  } catch (err) {
    req.log.error({ err }, "List users error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users", authMiddleware, async (req, res) => {
  try {
    const body = CreateUserBody.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 10);
    const [user] = await db.insert(usersTable).values({
      username: body.username,
      passwordHash,
      name: body.name,
      role: body.role,
      managerId: body.managerId ?? null,
    }).returning({
      id: usersTable.id,
      username: usersTable.username,
      name: usersTable.name,
      role: usersTable.role,
      managerId: usersTable.managerId,
      createdAt: usersTable.createdAt,
    });
    res.status(201).json(user);
  } catch (err) {
    req.log.error({ err }, "Create user error");
    res.status(400).json({ error: "Bad request" });
  }
});

router.get("/users/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [user] = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      name: usersTable.name,
      role: usersTable.role,
      managerId: usersTable.managerId,
      createdAt: usersTable.createdAt,
    }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (err) {
    req.log.error({ err }, "Get user error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
