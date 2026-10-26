#!/usr/bin/env node
import readline from "node:readline";
import { capabilities, examples, runSynthetic, manifest } from "./src/catalog.mjs";

const SLUG_PATTERN = "^[a-z0-9-]{1,64}$";
const toolsWithSlug = new Set(["get_capability", "get_schema", "get_synthetic_example", "run_synthetic_example"]);
const toolNames = ["list_capabilities", ...toolsWithSlug, "get_release_notes"];

const tools = toolNames.map((name) => {
  const requiresSlug = toolsWithSlug.has(name);
  return {
    name,
    description: `${name === "run_synthetic_example" ? "Return the frozen expected result; does not calculate on new records. " : ""}Read Level Open Finance ${name.replaceAll("_", " ")} data from Level. Synthetic examples only. Final decisions require human finance review. Source: https://levelcfo.com/finance-systems/`,
    inputSchema: {
      type: "object",
      properties: requiresSlug ? { slug: { type: "string", pattern: SLUG_PATTERN, description: "Skill slug from list_capabilities (e.g. reconcile-account, cash-flow-forecast, ar-integrity-review)." } } : {},
      ...(requiresSlug ? { required: ["slug"] } : {}),
      additionalProperties: false,
    },
  };
});

function toolResult(out) {
  return { content: [{ type: "text", text: JSON.stringify(out) }], structuredContent: out };
}

function send(msg) {
  process.stdout.write(`${JSON.stringify(msg)}\n`);
}

function handleMessage(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) || body.jsonrpc !== "2.0") {
    return send({ jsonrpc: "2.0", id: body?.id ?? null, error: { code: -32600, message: "invalid request" } });
  }
  const { id = null, method, params = {} } = body;
  if (method === "notifications/initialized" || !Object.hasOwn(body, "id")) {
    return;
  }
  if (method === "ping") {
    return send({ jsonrpc: "2.0", id, result: {} });
  }
  if (method === "initialize") {
    return send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: params?.protocolVersion || "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "level-open-finance-systems", version: manifest.version },
      },
    });
  }
  if (method === "tools/list") {
    return send({ jsonrpc: "2.0", id, result: { tools } });
  }
  if (method === "resources/list") {
    return send({ jsonrpc: "2.0", id, result: { resources: [] } });
  }
  if (method === "prompts/list") {
    return send({ jsonrpc: "2.0", id, result: { prompts: [] } });
  }
  if (method !== "tools/call") {
    return send({ jsonrpc: "2.0", id, error: { code: -32601, message: "unknown method" } });
  }
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    return send({ jsonrpc: "2.0", id, error: { code: -32602, message: "invalid arguments" } });
  }
  const name = params.name;
  const args = params.arguments ?? {};
  if (!toolNames.includes(name) || !args || typeof args !== "object" || Array.isArray(args)) {
    return send({ jsonrpc: "2.0", id, error: { code: -32602, message: "invalid arguments" } });
  }
  const requiresSlug = toolsWithSlug.has(name);
  const validKeys = Object.keys(args).every((key) => key === "slug");
  const validSlug = typeof args.slug === "string" && new RegExp(SLUG_PATTERN).test(args.slug);
  if (!validKeys || (requiresSlug && !validSlug) || (!requiresSlug && Object.keys(args).length > 0)) {
    return send({ jsonrpc: "2.0", id, error: { code: -32602, message: "invalid arguments" } });
  }
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
    return send({ jsonrpc: "2.0", id, result: toolResult(out) });
  } catch {
    return send({ jsonrpc: "2.0", id, error: { code: -32602, message: "capability not found" } });
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    handleMessage(JSON.parse(trimmed));
  } catch {
    send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "invalid request" } });
  }
});
