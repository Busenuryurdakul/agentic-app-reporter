/**
 * Verify a remote Ollama OpenAI-compatible HTTPS endpoint before updating Render.
 *
 * Usage (from backend/):
 *   OLLAMA_BASE_URL=https://ollama.example.com/v1 \
 *   OLLAMA_BEARER_TOKEN=your-secret \
 *   OLLAMA_MODEL=llama3.2 \
 *   node ./scripts/verify_ollama_endpoint.mjs
 *
 * Reads OLLAMA_* or LLM_* from backend/.env when env vars are unset.
 * Never logs tokens or full URLs with secrets.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
const fileEnv = loadEnv(envPath);

const baseURL = normalizeBase(
  process.env.OLLAMA_BASE_URL ||
    process.env.LLM_BASE_URL ||
    fileEnv.OLLAMA_BASE_URL ||
    fileEnv.LLM_BASE_URL ||
    "",
);
const token = (
  process.env.OLLAMA_BEARER_TOKEN ||
  process.env.LLM_API_KEY ||
  fileEnv.OLLAMA_BEARER_TOKEN ||
  fileEnv.LLM_API_KEY ||
  ""
).trim();
const model = (
  process.env.OLLAMA_MODEL ||
  process.env.LLM_MODEL ||
  fileEnv.OLLAMA_MODEL ||
  fileEnv.LLM_MODEL ||
  "llama3.2"
).trim();

function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i <= 0) continue;
    out[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim();
  }
  return out;
}

function normalizeBase(url) {
  return String(url || "")
    .trim()
    .replace(/\/$/, "");
}

function hostOnly(url) {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return "[invalid]";
  }
}

function headers() {
  const h = { Accept: "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function modelsMatch(configured, listed) {
  const norm = (m) => {
    m = String(m || "")
      .trim()
      .toLowerCase();
    const i = m.indexOf(":");
    return i > 0 ? m.slice(0, i) : m;
  };
  return norm(configured) === norm(listed);
}

if (!baseURL) {
  console.error("OLLAMA_BASE_URL or LLM_BASE_URL is required");
  console.error("Set in env or backend/.env (local only, not committed)");
  process.exit(1);
}

if (!baseURL.startsWith("https://")) {
  console.error("Production Ollama endpoint must use HTTPS");
  process.exit(1);
}

if (!baseURL.endsWith("/v1")) {
  console.error("Base URL must end with /v1 (OpenAI-compatible API root)");
  process.exit(1);
}

const host = hostOnly(baseURL).toLowerCase();
if (host === "router.huggingface.co" || host.endsWith(".huggingface.co")) {
  console.error("OLLAMA_BASE_URL must point at your Ollama VPS, not Hugging Face");
  process.exit(1);
}

console.log("Verifying Ollama endpoint");
console.log("  host:", hostOnly(baseURL));
console.log("  model:", model);
console.log("  auth:", token ? "Bearer [set]" : "none");

let failed = false;

try {
  const modelsRes = await fetch(`${baseURL}/models`, { headers: headers() });
  const modelsText = await modelsRes.text();
  let modelsData;
  try {
    modelsData = JSON.parse(modelsText);
  } catch {
    modelsData = null;
  }

  if (!modelsRes.ok) {
    console.error("FAIL GET /v1/models ->", modelsRes.status);
    failed = true;
  } else {
    const ids = (modelsData?.data || []).map((d) => d.id).filter(Boolean);
    const found = ids.some((id) => modelsMatch(model, id));
    console.log("PASS GET /v1/models ->", modelsRes.status, `(${ids.length} models listed)`);
    if (!found) {
      console.error(`FAIL model ${model} not found in provider list`);
      if (ids.length) console.error("  available:", ids.slice(0, 10).join(", "));
      failed = true;
    } else {
      console.log("PASS model listed:", model);
    }
  }
} catch (err) {
  console.error("FAIL GET /v1/models:", err.message);
  failed = true;
}

try {
  const chatRes = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
      stream: false,
    }),
  });
  const chatText = await chatRes.text();
  let chatData;
  try {
    chatData = JSON.parse(chatText);
  } catch {
    chatData = null;
  }

  if (!chatRes.ok) {
    console.error("FAIL POST /v1/chat/completions ->", chatRes.status);
    failed = true;
  } else {
    const content = chatData?.choices?.[0]?.message?.content || "";
    console.log("PASS POST /v1/chat/completions ->", chatRes.status);
    if (!String(content).trim()) {
      console.error("FAIL empty assistant content");
      failed = true;
    } else {
      console.log("PASS assistant content length:", String(content).trim().length);
    }
  }
} catch (err) {
  console.error("FAIL POST /v1/chat/completions:", err.message);
  failed = true;
}

if (failed) {
  console.error("\nVerification FAILED — fix VPS/Caddy/DNS before updating Render.");
  process.exit(1);
}

console.log("\nVerification PASSED — safe to run sync_render_llm_ollama.mjs");
process.exit(0);
