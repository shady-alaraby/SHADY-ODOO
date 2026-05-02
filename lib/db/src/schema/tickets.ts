import { pgTable, serial, text, integer, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const ticketsTable = pgTable("tickets", {
  id: serial("id").primaryKey(),
  odooId: integer("odoo_id").notNull().unique(),

  // Lead identity
  title: text("title"),                         // crm.lead.name
  clientName: text("client_name").notNull(),    // partner_name or contact_name
  contactName: text("contact_name"),            // contact_name
  phone: text("phone"),
  email: text("email"),

  // Pipeline
  expectedRevenue: real("expected_revenue"),
  stage: text("stage").notNull().default("New"),
  probability: real("probability"),

  // Salesperson (raw Odoo name + our mapping)
  salesperson: text("salesperson"),             // user_id display name from Odoo
  odooSalespersonName: text("odoo_salesperson_name"), // same, kept explicit for clarity

  // Dates
  lastUpdate: timestamp("last_update"),         // write_date
  lastOdooUpdate: timestamp("last_odoo_update"), // write_date alias for clarity
  createDate: timestamp("create_date"),

  // Local user assignments (resolved from salesperson mapping)
  assignedUserId: integer("assigned_user_id").references(() => usersTable.id),
  assignedTeamLeaderId: integer("assigned_team_leader_id").references(() => usersTable.id),
  assignedBusinessDeveloperId: integer("assigned_business_developer_id").references(() => usersTable.id),

  // Odoo deep link
  odooUrl: text("odoo_url"),

  // Metadata
  tags: jsonb("tags").$type<string[]>().default([]),
  internalNote: text("internal_note"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

export const insertTicketSchema = createInsertSchema(ticketsTable).omit({ id: true, syncedAt: true });
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof ticketsTable.$inferSelect;
