import http from "node:http";
import { pathToFileURL } from "node:url";
import { capabilities, examples, runSynthetic, manifest } from "./catalog.mjs";

const MAX_BODY = 16_384;
const ALLOWED_HOSTS = new Set(["127.0.0.1:8788", "localhost:8788"]);
const ALLOWED_ORIGINS = new Set(["http://127.0.0.1:3000", "http://localhost:3000"]);
const SLUG_PATTERN = "^[a-z0-9-]{1,64}$";
const calls = new Map();
const toolsWithSlug = new Set(["get_capability", "get_schema", "get_synthetic_example", "run_synthetic_example"]);
const toolNames = ["list_capabilities", ...toolsWithSlug, "get_release_notes"];

const tools = toolNames.map((name) => {
  const requiresSlug = toolsWithSlug.has(name);
  return {
    name,
    description: `${name === "run_synthetic_example" ? "Return the frozen expected result; does not calculate on new records. " : ""}Read Level Open Finance ${name.replaceAll("_", " ")} data from Level. Synthetic examples only. Final decisions require human finance review. Source: https://levelcfo.com/finance-systems/`,
    inputSchema: {
      type: "object",
      properties: requiresSlug ? { slug: { type: "string", pattern: SLUG_PATTERN } } : {},
      ...(requiresSlug ? { required: ["slug"] } : {}),
      additionalProperties: false,
    },
  };
});

function headers(origin) {
  return {
    "content-type": "application/json",
    "x-content-type-options": "nosniff",
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
    ...(origin ? { "access-control-allow-origin": origin } : {}),
    vary: "Origin",
  };
}

function reply(res, status, body, origin) {
  res.writeHead(status, headers(origin));
  res.end(JSON.stringify(body));
}

function error(res, id, code, message, origin, status = 400) {
  reply(res, status, { jsonrpc: "2.0", id, error: { code, message } }, origin);
}

function toolResult(out) {
  return { content: [{ type: "text", text: JSON.stringify(out) }], structuredContent: out };
}

export function createServer({ allowedHosts = ALLOWED_HOSTS, allowedOrigins = ALLOWED_ORIGINS } = {}) {
  return http.createServer((req, res) => {
    const origin = req.headers.origin;
    if (!allowedHosts.has(req.headers.host) || (origin && !allowedOrigins.has(origin))) return error(res, null, -32000, "request rejected", null, 403);
    if (req.method !== "POST" || req.url !== "/mcp") return error(res, null, -32601, "method not allowed", origin, 405);

    const ip = req.socket.remoteAddress || "local";
    const now = Date.now();
    const recent = (calls.get(ip) || []).filter((timestamp) => now - timestamp < 60_000);
    if (recent.length >= 60) return error(res, null, -32001, "rate limit exceeded", origin, 429);
    recent.push(now);
    calls.set(ip, recent);

    const declared = Number(req.headers["content-length"] || 0);
    if (!Number.isFinite(declared) || declared > MAX_BODY) return error(res, null, -32002, "request too large", origin, 413);

    let raw = "";
    let tooLarge = false;
    req.on("data", (chunk) => {
      if (tooLarge) return;
      raw += chunk;
      if (Buffer.byteLength(raw) > MAX_BODY) {
        tooLarge = true;
        error(res, null, -32002, "request too large", origin, 413);
      }
    });
    req.on("end", () => {
      if (tooLarge) return;
      let body;
      try { body = JSON.parse(raw); } catch { return error(res, null, -32700, "invalid request", origin); }
      if (!body || typeof body !== "object" || Array.isArray(body) || body.jsonrpc !== "2.0") return error(res, body?.id ?? null, -32600, "invalid request", origin);

      const { id = null, method, params = {} } = body;
      if (method === "notifications/initialized" && !Object.hasOwn(body, "id")) {
        res.writeHead(202, headers(origin));
        return res.end();
      }
      if (method === "ping" && Object.hasOwn(body, "id")) return reply(res, 200, { jsonrpc: "2.0", id, result: {} }, origin);
      if (method === "initialize") return reply(res, 200, { jsonrpc: "2.0", id, result: { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "level-open-finance-systems", version: manifest.version } } }, origin);
      if (method === "tools/list") return reply(res, 200, { jsonrpc: "2.0", id, result: { tools } }, origin);
      if (method !== "tools/call") return error(res, id, -32601, "unknown method", origin);
      if (!params || typeof params !== "object" || Array.isArray(params)) return error(res, id, -32602, "invalid arguments", origin);

      const name = params.name;
      const args = params.arguments ?? {};
      if (!toolNames.includes(name) || !args || typeof args !== "object" || Array.isArray(args)) return error(res, id, -32602, "invalid arguments", origin);
      const requiresSlug = toolsWithSlug.has(name);
      const validKeys = Object.keys(args).every((key) => key === "slug");
      const validSlug = typeof args.slug === "string" && new RegExp(SLUG_PATTERN).test(args.slug);
      if (!validKeys || (requiresSlug && !validSlug) || (!requiresSlug && Object.keys(args).length > 0)) return error(res, id, -32602, "invalid arguments", origin);

      try {
        let out;
        if (name === "list_capabilities") out = capabilities;
        else if (name === "get_release_notes") out = { version: manifest.version, notes: "0.2.1 corrects the idle-cash eligibility example and supplies all thirteen forecast weeks. Twenty skills preserved, three preview statuses unchanged. Local initialized-notification and ping responses supported. Synthetic MCP results remain frozen expected examples, not execution on new records. MIT licensed." };
        else {
          const capability = capabilities.find(({ slug }) => slug === args.slug);
          if (!capability) throw new Error("unknown capability");
          if (name === "get_capability") out = capability;
          else if (name === "get_schema") out = { slug: capability.slug, input: "Tool arguments contain only slug; no records accepted", output: "Checked-in synthetic fixture or frozen expected result", acceptsNewRecords: false, calculationExecuted: false, missingValues: "Null values in the checked-in fixture remain null; this is not a general record-validation promise", license: "MIT", attribution: "Level Open Finance by Level", source: "https://levelcfo.com/finance-systems/" };
          else if (name === "get_synthetic_example") out = examples[capability.slug];
          else out = runSynthetic(capability.slug);
        }
        return reply(res, 200, { jsonrpc: "2.0", id, result: toolResult(out) }, origin);
      } catch {
        return error(res, id, -32602, "capability not found", origin);
      }
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) createServer().listen(8788, "127.0.0.1", () => console.log("MCP dev server: http://127.0.0.1:8788/mcp"));
