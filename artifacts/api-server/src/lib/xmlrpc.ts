/**
 * Minimal XML-RPC client for Odoo.
 * Implements only the subset needed: integers, strings, booleans, doubles, arrays, structs, nil.
 */

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function valueToXml(v: unknown): string {
  if (v === null || v === undefined) return "<value><nil/></value>";
  if (typeof v === "boolean") return `<value><boolean>${v ? 1 : 0}</boolean></value>`;
  if (typeof v === "number") {
    if (Number.isInteger(v)) return `<value><int>${v}</int></value>`;
    return `<value><double>${v}</double></value>`;
  }
  if (typeof v === "string") return `<value><string>${escapeXml(v)}</string></value>`;
  if (Array.isArray(v)) {
    return `<value><array><data>${(v as unknown[]).map(valueToXml).join("")}</data></array></value>`;
  }
  if (typeof v === "object") {
    const members = Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `<member><name>${escapeXml(k)}</name>${valueToXml(val)}</member>`)
      .join("");
    return `<value><struct>${members}</struct></value>`;
  }
  return `<value><string>${escapeXml(String(v))}</string></value>`;
}

function buildMethodCall(method: string, params: unknown[]): string {
  return (
    `<?xml version='1.0'?>` +
    `<methodCall>` +
    `<methodName>${method}</methodName>` +
    `<params>${params.map((p) => `<param>${valueToXml(p)}</param>`).join("")}</params>` +
    `</methodCall>`
  );
}

// --- Simple XML-RPC response parser ---

type XmlRpcValue = string | number | boolean | null | XmlRpcValue[] | { [k: string]: XmlRpcValue };

function parseValue(node: string): XmlRpcValue {
  // Try each type in order
  const inner = (tag: string) => {
    const m = node.match(new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, "i"));
    return m ? m[1] : null;
  };

  if (/<nil\s*\/>/.test(node) || /<nil><\/nil>/.test(node)) return null;

  const intVal = inner("int") ?? inner("i4") ?? inner("i8");
  if (intVal !== null) return parseInt(intVal.trim(), 10);

  const dblVal = inner("double");
  if (dblVal !== null) return parseFloat(dblVal.trim());

  const boolVal = inner("boolean");
  if (boolVal !== null) return boolVal.trim() === "1";

  const strVal = inner("string");
  if (strVal !== null) return unescapeXml(strVal);

  // Array
  const arrMatch = node.match(/<array[^>]*>\s*<data>([\s\S]*?)<\/data>\s*<\/array>/i);
  if (arrMatch) {
    return parseValueList(arrMatch[1]);
  }

  // Struct
  const structMatch = node.match(/<struct>([\s\S]*?)<\/struct>/i);
  if (structMatch) {
    return parseStruct(structMatch[1]);
  }

  // Bare string (no inner tag)
  return unescapeXml(node.replace(/<[^>]+>/g, "").trim());
}

function parseValueList(data: string): XmlRpcValue[] {
  const values: XmlRpcValue[] = [];
  const valueRegex = /<value>([\s\S]*?)<\/value>/gi;
  let match;
  while ((match = valueRegex.exec(data)) !== null) {
    values.push(parseValue(match[1]));
  }
  return values;
}

function parseStruct(data: string): { [k: string]: XmlRpcValue } {
  const result: { [k: string]: XmlRpcValue } = {};
  const memberRegex = /<member>([\s\S]*?)<\/member>/gi;
  let match;
  while ((match = memberRegex.exec(data)) !== null) {
    const memberContent = match[1];
    const nameMatch = memberContent.match(/<name>([\s\S]*?)<\/name>/i);
    const valueMatch = memberContent.match(/<value>([\s\S]*?)<\/value>/i);
    if (nameMatch && valueMatch) {
      result[unescapeXml(nameMatch[1])] = parseValue(valueMatch[1]);
    }
  }
  return result;
}

function unescapeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseResponse(xml: string): XmlRpcValue {
  // Check for fault
  const faultMatch = xml.match(/<fault>([\s\S]*?)<\/fault>/i);
  if (faultMatch) {
    const fault = parseValue(faultMatch[1]) as { faultCode?: number; faultString?: string };
    throw new Error(`XML-RPC Fault ${fault?.faultCode ?? "?"}: ${fault?.faultString ?? "unknown"}`);
  }

  // Normal response — first param value
  const paramMatch = xml.match(/<params>\s*<param>\s*<value>([\s\S]*?)<\/value>\s*<\/param>/i);
  if (!paramMatch) {
    throw new Error("Invalid XML-RPC response: no <params><param><value> found");
  }
  return parseValue(paramMatch[1]);
}

// --- Public API ---

export async function xmlrpcCall(
  baseUrl: string,
  path: string,
  method: string,
  params: unknown[]
): Promise<XmlRpcValue> {
  const body = buildMethodCall(method, params);
  const url = `${baseUrl}${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/xml", "Accept": "text/xml" },
    body,
    // 30-second timeout
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`XML-RPC HTTP error ${res.status} from ${url}`);
  }

  const text = await res.text();
  return parseResponse(text);
}
