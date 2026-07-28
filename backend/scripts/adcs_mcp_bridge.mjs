#!/usr/bin/env node
/**
 * Stdio MCP bridge → ADCS HTTP MCP API (/api/v1/mcp/*).
 *
 * Env:
 *   ADCS_API_BASE      default http://127.0.0.1:8080/api/v1
 *   ADCS_API_KEY       required (adcs_… user API key)
 *   ADCS_ORG_ID        optional default X-Organization-ID
 *   ADCS_WORKSPACE_ID  optional default workspace_id injection
 *
 * Usage (Cursor .cursor/mcp.json):
 *   node backend/scripts/adcs_mcp_bridge.mjs
 */
import readline from "node:readline";

const API_BASE = (process.env.ADCS_API_BASE || "http://127.0.0.1:8080/api/v1").replace(/\/$/, "");
const API_KEY = (process.env.ADCS_API_KEY || "").trim();
const DEFAULT_ORG = (process.env.ADCS_ORG_ID || "").trim();
const DEFAULT_WORKSPACE = (process.env.ADCS_WORKSPACE_ID || "").trim();

if (!API_KEY) {
  process.stderr.write("ADCS_API_KEY is required (create one at /account/api-keys)\n");
  process.exit(1);
}

const SERVER_INFO = {
  name: "adcs-mcp-bridge",
  version: "1.0.0",
};

const TOOL_CACHE_TTL_MS = 60_000;
let cachedTools = null;
let cachedToolsAt = 0;

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function reply(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function replyError(id, code, message, data) {
  send({ jsonrpc: "2.0", id, error: { code, message, data } });
}

async function apiFetch(path, { method = "GET", body, orgId, workspaceId } = {}) {
  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    Accept: "application/json",
  };
  const org = orgId || DEFAULT_ORG;
  const workspace = workspaceId || DEFAULT_WORKSPACE;
  if (org) headers["X-Organization-ID"] = org;
  if (workspace) headers["X-Workspace-ID"] = workspace;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || text || res.statusText;
    throw new Error(`${method} ${path} -> ${res.status}: ${msg}`);
  }
  return data;
}

async function loadTools() {
  const now = Date.now();
  if (cachedTools && now - cachedToolsAt < TOOL_CACHE_TTL_MS) {
    return cachedTools;
  }
  const data = await apiFetch("/mcp/tools");
  cachedTools = (data.tools || []).map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: "object",
      properties: {
        organization_id: { type: "string", description: "Organization UUID (or set ADCS_ORG_ID)" },
        workspace_id: { type: "string", description: "Workspace UUID (or set ADCS_WORKSPACE_ID)" },
        document_id: { type: "string", description: "Document UUID (get_document only)" },
        limit: { type: "integer", description: "Max documents (list_documents only)" },
      },
      additionalProperties: false,
    },
  }));
  cachedToolsAt = now;
  return cachedTools;
}

async function callTool(name, args = {}) {
  const orgId = args.organization_id || DEFAULT_ORG;
  const workspaceId = args.workspace_id || DEFAULT_WORKSPACE;
  const payload = { name, arguments: { ...args } };
  delete payload.arguments.organization_id;

  const data = await apiFetch("/mcp/tools/call", {
    method: "POST",
    body: payload,
    orgId,
    workspaceId,
  });

  return {
    content: [{ type: "text", text: JSON.stringify(data.result ?? data, null, 2) }],
  };
}

async function handleMessage(msg) {
  const { id, method, params } = msg;

  if (method === "initialize") {
    reply(id, {
      protocolVersion: params?.protocolVersion || "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
    });
    return;
  }

  if (method === "notifications/initialized") {
    return;
  }

  if (method === "tools/list") {
    reply(id, { tools: await loadTools() });
    return;
  }

  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments || {};
    if (!name) {
      replyError(id, -32602, "tool name required");
      return;
    }
    try {
      reply(id, await callTool(name, args));
    } catch (err) {
      replyError(id, -32000, err instanceof Error ? err.message : String(err));
    }
    return;
  }

  if (id !== undefined && id !== null) {
    replyError(id, -32601, `Method not found: ${method}`);
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    return;
  }
  void handleMessage(msg).catch((err) => {
    if (msg?.id !== undefined && msg?.id !== null) {
      replyError(msg.id, -32603, err instanceof Error ? err.message : String(err));
    }
  });
});

process.stderr.write(`adcs-mcp-bridge listening (API ${API_BASE})\n`);
