import { pgTable, serial, text, integer, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const ticketsTable = pgTable("tickets", {
  id: serial("id").primaryKey(),
  odooId: integer("odoo_id").notNull().unique(),
  clientName: text("client_name").notNull(),
  phone: text("phone"),
  email: text("email"),
  expectedRevenue: real("expected_revenue"),
  stage: text("stage").notNull().default("New"),
  probability: real("probability"),
  salesperson: text("salesperson"),
  lastUpdate: timestamp("last_update"),
  createDate: timestamp("create_date"),
  assignedUserId: integer("assigned_user_id").references(() => usersTable.id),
  tags: jsonb("tags").$type<string[]>().default([]),
  internalNote: text("internal_note"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

export const insertTicketSchema = createInsertSchema(ticketsTable).omit({ id: true, syncedAt: true });
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof ticketsTable.$inferSelect;
