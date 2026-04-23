/**
 * Regression repro + fix verification for the 2026-04-23 PM bug:
 * Customer asks "營業時間" / "你們賣新車嗎" and AI responds about a
 * random vehicle (Toyota Corolla Cross GR Sport) — completely ignoring
 * the question.
 *
 * Root cause confirmed: buildLLMMessages was only clearing conversation
 * history for inquiry_button detection. For everything else, prior-session
 * assistant messages mentioning Toyota leaked into the LLM context,
 * causing recency-bias hallucination.
 *
 * Fix: `shouldClearHistoryForFreshTopic` also clears when the user asks a
 * general-business question (hours/address/phone/new_car) AND no vehicle is
 * detected in the current message AND no context-reference words.
 */

import { describe, it, expect } from "vitest";
import {
  detectVehicleFromMessage,
  buildVehicleIndex,
  detectCustomerIntents,
  detectQuestionType,
} from "./vehicleDetectionService";
import { buildLLMMessages } from "./dynamicPromptBuilder";

const mockInventory = [
  { id: 1, brand: "Toyota", model: "Corolla Cross GR Sport", modelYear: 2024, priceDisplay: "85萬", price: 85, status: "available" },
  { id: 2, brand: "Mazda", model: "CX-5", modelYear: 2021, priceDisplay: "55萬", price: 55, status: "available" },
  { id: 3, brand: "Mercedes-Benz", model: "Mufasa 2.0 GLC旗艦版", modelYear: 2020, priceDisplay: "80.9萬", price: 80.9, status: "available" },
];

const index = buildVehicleIndex(mockInventory);

// Simulates the live condition: prior session persisted assistant messages
// that mention Toyota Corolla Cross GR Sport. The NEW session's customer
// asks a fresh general question; history is loaded from DB with 5+ turns
// of prior Toyota discussion.
const staleToyotaHistory = [
  { role: "user", content: "哈囉我有看到你們一台 Toyota Corolla Cross GR Sport" },
  { role: "assistant", content: "好的！這台 Toyota Corolla Cross GR Sport 是我們精選車款..." },
  { role: "user", content: "多少錢" },
  { role: "assistant", content: "Toyota Corolla Cross GR Sport 售價 85萬！想了解什麼呢？" },
  // ... days pass ...
  { role: "user", content: "營業時間" }, // ← TODAY's message
];

function makePromptContext(userMessage: string, detection: any, intents: string[]): any {
  return {
    greeting: "人客",
    vehicleKB: "（11 台車）",
    targetVehiclePrompt: "",
    intentInstructions: "",
    detection,
    intents,
    customerContact: null,
    userMessage,
    inventoryList: mockInventory.map(v => `${v.brand} ${v.model}`),
  };
}

// ============================================================
// Part 1: Detection is already correct (no regression)
// ============================================================

describe("vehicle detection returns 'none' for general questions", () => {
  it("'營業時間' with empty history → type='none'", () => {
    const r = detectVehicleFromMessage("營業時間", mockInventory, [], index);
    expect(r.type).toBe("none");
    expect(r.vehicle).toBe(null);
  });

  it("'你們賣新車嗎' with empty history → type='none'", () => {
    const r = detectVehicleFromMessage("你們賣新車嗎", mockInventory, [], index);
    expect(r.type).toBe("none");
    expect(r.vehicle).toBe(null);
  });
});

// ============================================================
// Part 2: New 'new_car_question' intent works
// ============================================================

describe("new_car_question intent detection", () => {
  it("'你們賣新車嗎' → intents include 'new_car_question'", () => {
    const intents = detectCustomerIntents("你們賣新車嗎");
    expect(intents).toContain("new_car_question");
  });

  it("'你們有沒有新車' → intents include 'new_car_question'", () => {
    const intents = detectCustomerIntents("你們有沒有新車");
    expect(intents).toContain("new_car_question");
  });

  it("'想買新車' → intents include 'new_car_question'", () => {
    const intents = detectCustomerIntents("想買新車");
    expect(intents).toContain("new_car_question");
  });

  it("'這台新車主還是什麼' → does NOT trigger (新車主 is used-car context)", () => {
    // 新車主 = "new owner of this (used) car" — legit used-car phrase.
    const intents = detectCustomerIntents("這台新車主還是什麼");
    expect(intents).not.toContain("new_car_question");
  });

  it("'這款新車型好看' → does NOT trigger (新車型 = new model variant)", () => {
    // 新車型 = "new model variant" — refers to a newly listed used car.
    const intents = detectCustomerIntents("這款新車型好看");
    expect(intents).not.toContain("new_car_question");
  });
});

// ============================================================
// Part 3: buildLLMMessages clears history on fresh topic (THE FIX)
// ============================================================

describe("buildLLMMessages clears stale history when customer switches topic", () => {
  it("'營業時間' after Toyota history → NO Toyota in LLM messages", () => {
    const ctx = makePromptContext(
      "營業時間",
      { type: "none", vehicle: null, questionType: "general", directAnswer: "", termExplanation: "" },
      ["hours"],
    );
    const messages = buildLLMMessages(ctx, staleToyotaHistory);
    // System prompt + last user message = 2. With the fix, history messages 0-3 are dropped.
    const nonSystemNonLastContent = messages
      .filter(m => m.role !== "system")
      .slice(0, -1) // drop last user message ("營業時間")
      .map(m => m.content)
      .join(" ");
    expect(nonSystemNonLastContent).not.toContain("Toyota");
    expect(nonSystemNonLastContent).not.toContain("Corolla");
  });

  it("'你們賣新車嗎' after Toyota history → NO Toyota in LLM messages", () => {
    const staleHistoryWithNewCarQ = [
      ...staleToyotaHistory.slice(0, -1),
      { role: "user", content: "你們賣新車嗎" },
    ];
    const ctx = makePromptContext(
      "你們賣新車嗎",
      { type: "none", vehicle: null, questionType: "general", directAnswer: "", termExplanation: "" },
      ["new_car_question"],
    );
    const messages = buildLLMMessages(ctx, staleHistoryWithNewCarQ);
    const nonSystemNonLastContent = messages
      .filter(m => m.role !== "system")
      .slice(0, -1)
      .map(m => m.content)
      .join(" ");
    expect(nonSystemNonLastContent).not.toContain("Toyota");
    expect(nonSystemNonLastContent).not.toContain("Corolla");
  });

  it("'地址' after Toyota history → NO Toyota in LLM messages", () => {
    const ctx = makePromptContext(
      "地址",
      { type: "none", vehicle: null, questionType: "general", directAnswer: "", termExplanation: "" },
      ["address"],
    );
    const messages = buildLLMMessages(
      ctx,
      [...staleToyotaHistory.slice(0, -1), { role: "user", content: "地址" }],
    );
    const nonSystemNonLastContent = messages
      .filter(m => m.role !== "system")
      .slice(0, -1)
      .map(m => m.content)
      .join(" ");
    expect(nonSystemNonLastContent).not.toContain("Toyota");
  });

  it("'那台多少錢' after Toyota history → KEEPS Toyota in history (context follow-up)", () => {
    // Anti-regression: follow-up references ("那台") MUST keep their context.
    // Otherwise we'd break multi-turn vehicle inquiry flows.
    const history = [
      { role: "user", content: "我想看 Toyota Corolla Cross GR Sport" },
      { role: "assistant", content: "好的這台 Toyota Corolla Cross GR Sport 是 2024 年..." },
      { role: "user", content: "那台多少錢" },
    ];
    const ctx = makePromptContext(
      "那台多少錢",
      {
        type: "context",
        vehicle: mockInventory[0],
        questionType: "price",
        directAnswer: "售價 85萬",
        termExplanation: "",
      },
      ["pricing"],
    );
    const messages = buildLLMMessages(ctx, history);
    const nonSystemContent = messages
      .filter(m => m.role !== "system")
      .map(m => m.content)
      .join(" ");
    // History should be intact — Toyota context must be preserved for the follow-up.
    expect(nonSystemContent).toContain("Toyota");
  });

  it("Active vehicle inquiry (detection.type='mentioned') does NOT clear history", () => {
    // Another anti-regression: if the current message explicitly names a
    // vehicle, the history stays so the LLM has full conversation context.
    const history = [
      { role: "user", content: "你好" },
      { role: "assistant", content: "你好！我們有 Toyota Corolla Cross GR Sport、Mazda CX-5..." },
      { role: "user", content: "Mazda CX-5 多少錢" },
    ];
    const ctx = makePromptContext(
      "Mazda CX-5 多少錢",
      {
        type: "mentioned",
        vehicle: mockInventory[1],
        questionType: "price",
        directAnswer: "售價 55萬",
        termExplanation: "",
      },
      ["pricing"],
    );
    const messages = buildLLMMessages(ctx, history);
    // History preserved.
    expect(messages.filter(m => m.role !== "system").length).toBeGreaterThan(1);
  });
});
