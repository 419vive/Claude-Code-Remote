/**
 * Tests for the 2026-04-24 conversation script updates Jerry requested:
 *   1. Trade-in / 換車估車 — new 3-question intake template
 *   2. Price negotiation — 2-step script (solicit target → pivot to in-store)
 *
 * Both flows previously lacked LLM intent instructions (price_negotiation
 * was DETECTED but had no handler — that's why the LLM was ad-libbing).
 * These tests lock in:
 *   - intent detection fires for the right phrasings
 *   - intent detection does NOT false-positive on adjacent phrases
 *   - rule-based fallback produces Jerry's exact wording
 *   - LLM intent instructions include the verbatim script text
 */

import { describe, it, expect } from "vitest";
import { detectCustomerIntents, buildIntentInstructions } from "./vehicleDetectionService";
import { generateRuleBasedReply } from "./ruleBasedReply";

const baseDetection = {
  type: "none" as const,
  vehicle: null,
  questionType: "general" as const,
  directAnswer: "",
  termExplanation: "",
};

function ruleCtx(userMessage: string, intents: string[]) {
  return {
    userMessage,
    greeting: "人客",
    detection: baseDetection,
    intents,
    customerContact: null as string | null,
  };
}

// ============================================================
// PART 1 — Trade-in / 換車估車
// ============================================================

describe("trade_in_inquiry intent — detection", () => {
  it.each([
    ["我有一台舊車想估價"],
    ["想換車"],
    ["我要換車"],
    ["想估車"],
    ["要估車"],
    ["收車"],
    ["車換車"],
    ["想賣車"],
    ["估個價"],
    ["以舊換新"],
  ])("DETECTS '%s' as trade_in_inquiry", (msg) => {
    const intents = detectCustomerIntents(msg);
    expect(intents).toContain("trade_in_inquiry");
  });

  it.each([
    ["想看車"], // appointment-y, not trade-in
    ["有什麼車"], // browse
    ["我想看 BMW X1"], // specific vehicle inquiry
    ["你們的車多少錢"], // pricing
  ])("does NOT detect '%s' as trade_in_inquiry (false-positive guard)", (msg) => {
    const intents = detectCustomerIntents(msg);
    expect(intents).not.toContain("trade_in_inquiry");
  });
});

describe("trade_in_inquiry — rule-based fallback uses Jerry's exact template", () => {
  it("produces all 3 numbered questions", () => {
    const reply = generateRuleBasedReply(ruleCtx("我想估車", ["trade_in_inquiry"]));
    expect(reply).toContain("1. 請問有請別間車行估過了嗎？");
    expect(reply).toContain("2. 請提供車品牌、型號、顏色、公里數、年份");
    expect(reply).toContain("3. 是否有任何鈑件零件更換？");
  });

  it("includes the closing trust statement (誠信為原則)", () => {
    const reply = generateRuleBasedReply(ruleCtx("以舊換新", ["trade_in_inquiry"]));
    expect(reply).toContain("以「誠信」為原則");
    expect(reply).toContain("（收車還是會以看到實車為主）");
  });

  it("opens with the heart-emoji greeting", () => {
    const reply = generateRuleBasedReply(ruleCtx("車換車", ["trade_in_inquiry"]));
    expect(reply).toMatch(/^🤍 .* 您好，謝謝您的訊息！/);
  });

  it("does NOT contain the typo characters Jerry originally typed", () => {
    // Jerry's draft had: 原擇 (should be 原則), ㄧ直 (should be 一直, ㄧ is zhuyin not Chinese)
    const reply = generateRuleBasedReply(ruleCtx("想估車", ["trade_in_inquiry"]));
    expect(reply).not.toContain("原擇"); // typo
    expect(reply).not.toContain("ㄧ直"); // zhuyin not Chinese
    expect(reply).not.toContain("ㄧ趟"); // zhuyin not Chinese
  });
});

describe("trade_in_inquiry — LLM intent instruction is verbatim", () => {
  it("buildIntentInstructions includes Jerry's exact 3-question template", () => {
    const out = buildIntentInstructions(["trade_in_inquiry"], "我想估車", "人客", null, null);
    expect(out).toContain("1. 請問有請別間車行估過了嗎？");
    expect(out).toContain("2. 請提供車品牌、型號、顏色、公里數、年份");
    expect(out).toContain("3. 是否有任何鈑件零件更換？");
    expect(out).toContain("以「誠信」為原則");
    expect(out).toContain("（收車還是會以看到實車為主）");
  });

  it("LLM instruction forbids ad-libbing the price (cannot make up estimate)", () => {
    const out = buildIntentInstructions(["trade_in_inquiry"], "我想估車", "人客", null, null);
    expect(out).toContain("自己編造收購價格");
    expect(out).toContain("等真人業務看到實車後才能報價");
  });
});

// ============================================================
// PART 2 — Price negotiation 2-step script
// ============================================================

describe("price_negotiation intent — detection", () => {
  it.each([
    ["可以再便宜嗎"],
    ["可以殺多少"],
    ["有議價空間嗎"],
    ["算便宜一點"],
    ["有打折嗎"],
    ["最低多少"],
    ["底價多少"],
    ["再少一點"],
    ["可以降價嗎"],
  ])("DETECTS '%s' as price_negotiation (haggling phrasings)", (msg) => {
    const intents = detectCustomerIntents(msg);
    expect(intents).toContain("price_negotiation");
  });

  // 2026-04-24 second-pass extension — these were missing before the e2e
  // simulation caught them. "60萬可以嗎" was falling through to greeting
  // template because no intent matched.
  it.each([
    ["60萬可以嗎"],
    ["50萬可不可以"],
    ["80萬OK嗎"],
    ["45萬如何"],
    ["我出50萬"],
    ["我願意出50"],
    ["出價50萬"],
    ["頂多50萬"],
    ["最多40萬"],
  ])("DETECTS '%s' as price_negotiation (customer-naming-target-price phrasings)", (msg) => {
    const intents = detectCustomerIntents(msg);
    expect(intents).toContain("price_negotiation");
  });

  it.each([
    ["這台60萬"], // DB-sourced price quote, not a negotiation
    ["售價60萬"], // pricing intent, not negotiation
    ["有沒有60萬以下的"], // budget filter, not negotiation
  ])("does NOT trigger price_negotiation on '%s' (false-positive guard)", (msg) => {
    const intents = detectCustomerIntents(msg);
    expect(intents).not.toContain("price_negotiation");
  });
});

describe("price_negotiation — rule-based 2-step script", () => {
  it("STEP 1: customer asks first time → solicit target price", () => {
    const reply = generateRuleBasedReply(ruleCtx("可以再便宜嗎", ["price_negotiation"]));
    expect(reply).toContain("這裡可以盡量幫您爭取，或您有理想的出價嗎？");
  });

  it("STEP 1: 殺價 first time → solicit target price", () => {
    const reply = generateRuleBasedReply(ruleCtx("可以殺多少", ["price_negotiation"]));
    expect(reply).toContain("有理想的出價嗎");
  });

  it("STEP 2: customer named a price (萬) → pivot to in-store visit", () => {
    // "60萬可以嗎" — customer is responding to step 1's prompt
    const reply = generateRuleBasedReply(ruleCtx("60萬可以嗎", ["price_negotiation"]));
    expect(reply).toContain("先來店一趟看完車再來詳談價錢");
    expect(reply).toContain("買車就是多看多比沒關係");
  });

  it("STEP 2: customer used 出價 phrasing → pivot to in-store visit", () => {
    const reply = generateRuleBasedReply(ruleCtx("我出價50萬", ["price_negotiation"]));
    expect(reply).toContain("先來店一趟");
  });

  it("never commits to a specific discount on LINE (廣告法 safety)", () => {
    const reply = generateRuleBasedReply(ruleCtx("可以便宜嗎", ["price_negotiation"]));
    expect(reply).not.toContain("保證");
    expect(reply).not.toContain("最低價");
    expect(reply).not.toContain("一定");
  });

  it("does NOT contain the typo characters Jerry originally typed", () => {
    const reply = generateRuleBasedReply(ruleCtx("有議價空間嗎", ["price_negotiation"]));
    expect(reply).not.toContain("這里"); // simplified char (should be 這裡)
    expect(reply).not.toContain("ㄧ趟"); // zhuyin (should be 一趟)
  });
});

describe("price_negotiation — LLM intent instruction has the 2-step script", () => {
  it("includes both step 1 and step 2 verbatim wording", () => {
    const out = buildIntentInstructions(["price_negotiation"], "可以便宜嗎", "人客", null, null);
    // Step 1 verbatim
    expect(out).toContain("這裡可以盡量幫您爭取，或您有理想的出價嗎？");
    // Step 2 verbatim
    expect(out).toContain("比較希望您先來店一趟看完車再來詳談價錢的事，買車就是多看多比沒關係的☺️");
  });

  it("explicitly forbids LINE-side price commitments + advertising-law triggers", () => {
    const out = buildIntentInstructions(["price_negotiation"], "可以便宜嗎", "人客", null, null);
    expect(out).toContain("絕對不要在 LINE 上承諾任何具體價格");
    expect(out).toContain("廣告法");
  });
});
