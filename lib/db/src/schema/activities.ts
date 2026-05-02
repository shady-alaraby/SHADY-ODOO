import { pgTable, serial, integer, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ticketsTable } from "./tickets";
import { usersTable } from "./users";

export const activityTypeEnum = pgEnum("activity_type", ["call", "meeting", "whatsapp", "email", "note"]);

export const activitiesTable = pgTable("activities", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => ticketsTable.id),
  userId: integer("user_id").references(() => usersTable.id),
  type: activityTypeEnum("type").notNull(),
  summary: text("summary"),
  internalOnly: boolean("internal_only").notNull().default(true),
  doneAt: timestamp("done_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivitySchema = createInsertSchema(activitiesTable).omit({ id: true, createdAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activitiesTable.$inferSelect;
