/**
 * verifyLiveLLM.ts — End-to-end verification that Gemini ACTUALLY OBEYS the
 * intent instructions we ship in the system prompt.
 *
 * Designed to run from GitHub Actions (which has full internet access; the
 * Cloud Claude Code sandbox does too for Gemini specifically, but cannot
 * reach Railway / LINE for live webhook testing).
 *
 * Reads GOOGLE_AI_API_KEY (or GEMINI_API_KEY) from env. For each scenario:
 *   1. Builds the SAME system prompt the live LINE webhook builds.
 *   2. Sends it to Gemini via the OpenAI-compatible endpoint.
 *   3. Asserts Gemini's reply contains the verbatim phrases Jerry specified.
 *
 * Exits 0 on full pass, 1 if any scenario fails (so GH Actions can red-X).
 *
 * Run locally:  GOOGLE_AI_API_KEY=xxx npx tsx scripts/verifyLiveLLM.ts
 * Run in CI:    triggered by .github/workflows/verify-live-llm.yml
 */

import {
  detectVehicleFromMessage,
  buildVehicleIndex,
  detectCustomerIntents,
  buildIntentInstructions,
} from "../server/vehicleDetectionService";
import { buildLLMMessages, type PromptContext } from "../server/dynamicPromptBuilder";

const API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

if (!API_KEY) {
  console.error("❌ GOOGLE_AI_API_KEY (or GEMINI_API_KEY) env var not set.");
  console.error("   Add it as a GitHub Actions secret named GOOGLE_AI_API_KEY.");
  process.exit(2);
}

// Inventory snapshot — represents what the live bot would see from the DB
// after sync8891 runs. Models match real production catalog enough to make
// the prompt realistic.
const inventory = [
  { id: 1, brand: "MG", model: "G50", modelYear: 2022, priceDisplay: "94.8萬", price: 94.8, status: "available" },
  { id: 2, brand: "Mazda", model: "CX-5", modelYear: 2021, priceDisplay: "90.8萬", price: 90.8, status: "available" },
  { id: 3, brand: "Toyota", model: "Corolla Cross GR Sport", modelYear: 2024, priceDisplay: "85萬", price: 85, status: "available" },
];

interface Scenario {
  id: number;
  label: string;
  message: string;
  /** Gemini reply MUST contain at least one phrase from this list */
  mustContainAny: string[];
  /** Gemini reply MUST NOT contain any phrase from this list */
  mustNotContain: string[];
  /** Optional: prior conversation history (simulates multi-turn) */
  history?: Array<{ role: string; content: string }>;
}

const scenarios: Scenario[] = [
  {
    id: 1,
    label: "Trade-in inquiry → 3-question intake",
    message: "我有舊車想估價",
    mustContainAny: ["請問有請別間車行估過了嗎"],
    mustNotContain: ["98.9", "新車價", "台北", "內湖", "undefined萬"],
  },
  {
    id: 2,
    label: "Trade-in 換車 variant",
    message: "車換車可以嗎",
    mustContainAny: ["請問有請別間車行估過了嗎", "車品牌、型號、顏色、公里數"],
    mustNotContain: ["98.9", "新車價", "台北", "內湖"],
  },
  {
    id: 3,
    label: "Price negotiation Step 1",
    message: "MG G50 可以再便宜嗎",
    mustContainAny: ["這裡可以盡量幫您爭取", "理想的出價"],
    mustNotContain: ["保證最低", "100%", "絕對便宜"],
  },
  {
    id: 4,
    label: "Price negotiation Step 2 (customer named price)",
    message: "60萬可以嗎",
    mustContainAny: ["先來店一趟", "多看多比"],
    mustNotContain: ["60萬可以", "60萬OK", "成交"],
    history: [
      { role: "user", content: "MG G50 可以再便宜嗎" },
      { role: "assistant", content: "這裡可以盡量幫您爭取，或您有理想的出價嗎？" },
    ],
  },
  {
    id: 5,
    label: "Price negotiation '可以殺多少'",
    message: "可以殺多少",
    mustContainAny: ["這裡可以盡量幫您爭取", "理想的出價"],
    mustNotContain: ["100%", "保證", "底價"],
  },
  {
    id: 6,
    label: "Hours question — must NOT hallucinate vehicle",
    message: "營業時間",
    mustContainAny: ["9:30-20:00", "週一至週日"],
    mustNotContain: ["Toyota", "Corolla", "MG G50", "Mazda", "你對這台", "你傳的是"],
    history: [
      { role: "user", content: "MG G50 多少錢" },
      { role: "assistant", content: "MG G50 售價 94.8萬，2022 年..." },
    ],
  },
  {
    id: 7,
    label: "New-car question — must redirect to 中古",
    message: "你們賣新車嗎",
    mustContainAny: ["中古車", "二手"],
    mustNotContain: ["新車價", "Toyota", "Corolla", "98.9", "你對這台"],
    history: [
      { role: "user", content: "MG G50" },
      { role: "assistant", content: "好的這台 MG G50 是 2022 年的車款..." },
    ],
  },
  {
    id: 8,
    label: "Address question — must NOT hallucinate Taipei",
    message: "你們在哪裡",
    mustContainAny: ["高雄", "三民"],
    mustNotContain: ["台北", "內湖", "新北", "信義", "Toyota", "你對這台"],
  },
];

function buildSystemPromptForScenario(s: Scenario) {
  const vIndex = buildVehicleIndex(inventory);
  const detection = detectVehicleFromMessage(s.message, inventory, s.history || [], vIndex);
  const intents = detectCustomerIntents(s.message);

  const ctx: PromptContext = {
    greeting: "人客",
    vehicleKB: inventory.map(v => `- ${v.brand} ${v.model}（${v.modelYear}年）售價 ${v.priceDisplay}`).join("\n"),
    targetVehiclePrompt: "",
    intentInstructions: buildIntentInstructions(intents, s.message, "人客", null, detection.vehicle),
    detection: detection as PromptContext["detection"],
    intents,
    customerContact: null,
    userMessage: s.message,
    inventoryList: inventory.map(v => `${v.brand} ${v.model}`),
  };

  const fullHistory = [...(s.history || []), { role: "user", content: s.message }];
  return { messages: buildLLMMessages(ctx, fullHistory), detection, intents };
}

async function callGemini(messages: Array<{ role: string; content: string }>): Promise<string> {
  const res = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: messages.map(m => ({ role: m.role === "system" ? "system" : m.role, content: m.content })),
      max_tokens: 600,
      temperature: 0.4, // lower → more deterministic, easier to verify
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty Gemini response: " + JSON.stringify(data).slice(0, 300));
  return text;
}

interface Result {
  scenario: Scenario;
  reply: string;
  containsAnyExpected: boolean;
  forbiddenHits: string[];
  pass: boolean;
}

async function runScenario(s: Scenario): Promise<Result> {
  const { messages, detection, intents } = buildSystemPromptForScenario(s);
  console.log(`\n━━━ Scenario ${s.id}: ${s.label} ━━━`);
  console.log(`📨 Customer: "${s.message}"`);
  console.log(`🔍 Detected intents: [${intents.join(", ") || "none"}]`);
  console.log(`🚗 Detected vehicle: ${detection.vehicle ? `${detection.vehicle.brand} ${detection.vehicle.model}` : "none"}`);

  const reply = await callGemini(messages);
  console.log(`💬 Gemini reply:\n  ${reply.replace(/\n/g, "\n  ")}`);

  const containsAnyExpected = s.mustContainAny.some(p => reply.includes(p));
  const forbiddenHits = s.mustNotContain.filter(p => reply.includes(p));
  const pass = containsAnyExpected && forbiddenHits.length === 0;

  console.log(`\n  ${containsAnyExpected ? "✅" : "❌"} contains required phrase: ${containsAnyExpected ? "yes" : "NO"}`);
  if (!containsAnyExpected) console.log(`     (expected ANY of: ${s.mustContainAny.map(p => `"${p}"`).join(", ")})`);
  console.log(`  ${forbiddenHits.length === 0 ? "✅" : "❌"} no forbidden phrases: ${forbiddenHits.length === 0 ? "yes" : "NO — found " + forbiddenHits.join(", ")}`);
  console.log(`  ${pass ? "✅ PASS" : "❌ FAIL"}`);

  return { scenario: s, reply, containsAnyExpected, forbiddenHits, pass };
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("LIVE GEMINI INTEGRATION VERIFICATION");
  console.log(`Model: ${MODEL}`);
  console.log(`Scenarios: ${scenarios.length}`);
  console.log("═══════════════════════════════════════════════════════════");

  const results: Result[] = [];
  for (const s of scenarios) {
    try {
      results.push(await runScenario(s));
    } catch (err) {
      console.error(`Scenario ${s.id} threw:`, err);
      results.push({ scenario: s, reply: "", containsAnyExpected: false, forbiddenHits: [], pass: false });
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("SUMMARY");
  console.log("═══════════════════════════════════════════════════════════");
  const passed = results.filter(r => r.pass).length;
  for (const r of results) {
    console.log(`${r.pass ? "✅" : "❌"} #${r.scenario.id} ${r.scenario.label}`);
  }
  console.log(`\n${passed}/${results.length} passed`);

  if (passed < results.length) {
    console.log("\n⚠️  At least one scenario failed. Inspect the Gemini replies above.");
    process.exit(1);
  }
  console.log("\n✅ All scenarios passed. Live LLM obeys the new intent scripts.");
  process.exit(0);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
