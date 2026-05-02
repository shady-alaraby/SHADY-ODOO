/**
 * Odoo CRM integration service.
 * Uses XML-RPC as specified: /xmlrpc/2/common + /xmlrpc/2/object
 * Credentials come exclusively from environment variables — never hardcoded.
 */

import { xmlrpcCall } from "../lib/xmlrpc.js";
import { logger } from "../lib/logger.js";

export interface OdooCredentials {
  url: string;
  db: string;
  username: string;
  apiKey: string;
}

export interface OdooLead {
  id: number;
  name: string | null;
  contact_name: string | null;
  partner_name: string | null;
  email_from: string | null;
  phone: string | null;
  mobile: string | null;
  user_id: [number, string] | false;
  team_id: [number, string] | false;
  stage_id: [number, string] | false;
  probability: number | null;
  expected_revenue: number | null;
  create_date: string | null;
  write_date: string | null;
}

function getCredentials(): OdooCredentials | null {
  const url = process.env.ODOO_URL;
  const db = process.env.ODOO_DB;
  const username = process.env.ODOO_USERNAME;
  const apiKey = process.env.ODOO_API_KEY;

  if (!url || !db || !username || !apiKey) return null;
  return { url, db, username, apiKey };
}

/**
 * Authenticate with Odoo via XML-RPC.
 * Returns the numeric user id (uid) on success, throws on failure.
 */
export async function authenticate(creds: OdooCredentials): Promise<number> {
  const uid = await xmlrpcCall(
    creds.url,
    "/xmlrpc/2/common",
    "authenticate",
    [creds.db, creds.username, creds.apiKey, {}]
  );

  if (typeof uid !== "number" || uid === 0) {
    throw new Error("Invalid Odoo credentials or DB name — authentication returned no user id");
  }

  logger.info({ uid }, "Odoo authentication successful");
  return uid;
}

/**
 * Fetch crm.lead records from Odoo via XML-RPC.
 */
export async function searchReadLeads(
  creds: OdooCredentials,
  uid: number,
  limit = 500,
  offset = 0
): Promise<OdooLead[]> {
  const fields = [
    "id", "name", "contact_name", "partner_name",
    "email_from", "phone", "mobile",
    "user_id", "team_id", "stage_id",
    "probability", "expected_revenue",
    "create_date", "write_date",
  ];

  const result = await xmlrpcCall(
    creds.url,
    "/xmlrpc/2/object",
    "execute_kw",
    [
      creds.db,
      uid,
      creds.apiKey,
      "crm.lead",
      "search_read",
      [[]], // domain: all active leads
      { fields, limit, offset },
    ]
  );

  if (!Array.isArray(result)) {
    throw new Error(`Unexpected response from Odoo search_read: ${typeof result}`);
  }

  return result as unknown as OdooLead[];
}

/**
 * Fetch a single crm.lead by its Odoo ID.
 */
export async function getLeadById(
  creds: OdooCredentials,
  uid: number,
  odooId: number
): Promise<OdooLead | null> {
  const fields = [
    "id", "name", "contact_name", "partner_name",
    "email_from", "phone", "mobile",
    "user_id", "team_id", "stage_id",
    "probability", "expected_revenue",
    "create_date", "write_date",
  ];

  const result = await xmlrpcCall(
    creds.url,
    "/xmlrpc/2/object",
    "execute_kw",
    [
      creds.db,
      uid,
      creds.apiKey,
      "crm.lead",
      "read",
      [[odooId]],
      { fields },
    ]
  );

  if (!Array.isArray(result) || result.length === 0) return null;
  return result[0] as unknown as OdooLead;
}

/**
 * Test connection: authenticate and fetch 1 record.
 * Returns { success, uid, sampleId } or throws with a descriptive message.
 */
export async function testConnection(): Promise<{ success: boolean; uid: number; sampleLead: OdooLead | null }> {
  const creds = getCredentials();
  if (!creds) {
    throw new Error("Odoo credentials not configured (ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_API_KEY required)");
  }

  const uid = await authenticate(creds);
  const leads = await searchReadLeads(creds, uid, 1, 0);
  return { success: true, uid, sampleLead: leads[0] ?? null };
}

export { getCredentials };
