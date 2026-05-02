import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const odooMappingsTable = pgTable("odoo_mappings", {
  id: serial("id").primaryKey(),
  odooSalesperson: text("odoo_salesperson").notNull().unique(),
  localUserId: integer("local_user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOdooMappingSchema = createInsertSchema(odooMappingsTable).omit({ id: true, createdAt: true });
export type InsertOdooMapping = z.infer<typeof insertOdooMappingSchema>;
export type OdooMapping = typeof odooMappingsTable.$inferSelect;
