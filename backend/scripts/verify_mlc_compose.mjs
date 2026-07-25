/**
 * Verify MLC OpenAI-compatible endpoint (mock-llm or real MLC container).
 * Does not require LLM_API_KEY — suitable for local Docker MLC.
 *
 * Usage (from backend/):
 *   node ./scripts/verify_mlc_compose.mjs
 *
 * Env:
 *   MLC_BASE   default http://127.0.0.1:8081
 *   MLC_MODEL  default HF://mlc-ai/gemma-2b-it-q4f16_1-MLC (real MLC) or mock-mlc-model
 */
const MLC_BASE = (process.env.MLC_BASE || "http://127.0.0.1:8081").replace(/\/$/, "");
const MLC_MODEL = process.env.MLC_MODEL || "";
const MOCK_MODEL = "mock-mlc-model";

let failed = 0;

async function step(name, fn) {
  try {
    await fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failed++;
    console.log(`FAIL  ${name} — ${err.message}`);
  }
}

async function stepOptional(name, fn) {
  try {
    await fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    console.log(`SKIP  ${name} — ${err.message}`);
  }
}

console.log("MLC_BASE:", MLC_BASE);

// mock-llm exposes /health; real MLC only has /v1/models — skip without failing.
await stepOptional("GET /health (mock-llm only)", async () => {
  const res = await fetch(`${MLC_BASE}/health`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text.includes("ok")) throw new Error(`unexpected body: ${text.slice(0, 80)}`);
});

await step("GET /v1/models", async () => {
  const res = await fetch(`${MLC_BASE}/v1/models`, {
    headers: { Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${text.slice(0, 200)}`);
  const data = JSON.parse(text);
  if (!Array.isArray(data?.data)) throw new Error("missing data[] in models response");
  console.log(`      models: ${data.data.map((m) => m.id).join(", ") || "(empty)"}`);
});

await step("POST /v1/chat/completions", async () => {
  const modelsRes = await fetch(`${MLC_BASE}/v1/models`);
  const modelsData = await modelsRes.json();
  const listed = modelsData?.data?.[0]?.id;
  const model = MLC_MODEL || listed || MOCK_MODEL;

  const res = await fetch(`${MLC_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
      max_tokens: 32,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${text.slice(0, 300)}`);
  const data = JSON.parse(text);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("empty completion");
  console.log(`      model=${model} sample=${String(content).slice(0, 80)}`);
});

console.log("");
console.log(failed === 0 ? "MLC endpoint checks passed." : `${failed} check(s) failed.`);
process.exit(failed > 0 ? 1 : 0);
