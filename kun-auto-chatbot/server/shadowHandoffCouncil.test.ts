/**
 * Tests for shadowEvaluateHandoff — decision parsing and error-handling shape.
 *
 * We stub the LLM via dependency injection (no network, no API key required).
 * The goal is to lock down:
 *   - decision extraction keywords (handoff / ai_disabled / auto_reply)
 *   - confidence scoring from agree-vs-clash lengths
 *   - fail-soft: llm error returns ruleDecision as the councilDecision
 */
import { describe, it, expect, vi } from "vitest";
import { shadowEvaluateHandoff } from "./shadowHandoffCouncil";
import type { InvokeResult } from "./_core/llm";

function makeLlm(scriptedResponses: string[]): (params: any) => Promise<InvokeResult> {
  let i = 0;
  return async () => {
    const content = scriptedResponses[i++] ?? "";
    return {
      id: `stub-${i}`,
      created: Date.now(),
      model: "stub",
      choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
    };
  };
}

const BASE_INPUT = {
  userMessage: "這台CR-V還有現貨嗎？",
  conversationSummary: "新客戶，第一次詢問。",
  ruleDecision: "auto_reply" as const,
  flagReason: "stock-check on non-current-inventory vehicle",
};

describe("shadowEvaluateHandoff", () => {
  it("extracts handoff decision from chairman recommendation", async () => {
    // 2 lens responses + chairman verdict (peer review disabled in prod config)
    const llm = makeLlm([
      "Contrarian: operator should see this first.",
      "Executor: handoff to human now.",
      [
        "WHERE_AGREES: Both advisors flag risk of phantom stock.",
        "WHERE_CLASHES: None.",
        "BLIND_SPOTS_CAUGHT: -",
        "RECOMMENDATION: handoff",
        "ONE_THING_TO_DO_FIRST: Set status=human_handoff and notify operator.",
      ].join("\n"),
    ]);

    const result = await shadowEvaluateHandoff(BASE_INPUT, { llmClient: llm, skipLog: true });
    expect(result.councilDecision).toBe("handoff");
    expect(["low", "medium", "high"]).toContain(result.confidence);
    expect(result.trace.stats.totalLlmCalls).toBe(3);
  });

  it("extracts ai_disabled when chairman recommends permanent lock", async () => {
    const llm = makeLlm([
      "Contrarian: response.",
      "Executor: response.",
      [
        "WHERE_AGREES: Customer is abusive; clear operator-only.",
        "WHERE_CLASHES: None.",
        "BLIND_SPOTS_CAUGHT: -",
        "RECOMMENDATION: ai_disabled permanently; operator must intervene.",
        "ONE_THING_TO_DO_FIRST: Set aiDisabled=1 and notify operator.",
      ].join("\n"),
    ]);

    const result = await shadowEvaluateHandoff(BASE_INPUT, { llmClient: llm, skipLog: true });
    expect(result.councilDecision).toBe("ai_disabled");
  });

  it("defaults to auto_reply when chairman output is ambiguous", async () => {
    const llm = makeLlm([
      "Contrarian.",
      "Executor.",
      [
        "WHERE_AGREES: Question is routine.",
        "WHERE_CLASHES: None.",
        "BLIND_SPOTS_CAUGHT: -",
        "RECOMMENDATION: Let the AI answer.",
        "ONE_THING_TO_DO_FIRST: auto_reply with stock check.",
      ].join("\n"),
    ]);
    const result = await shadowEvaluateHandoff(BASE_INPUT, { llmClient: llm, skipLog: true });
    expect(result.councilDecision).toBe("auto_reply");
  });

  it("scores confidence=high when agreement dominates disagreement", async () => {
    const llm = makeLlm([
      "C",
      "X",
      [
        "WHERE_AGREES: " + "A".repeat(400),
        "WHERE_CLASHES: none",
        "BLIND_SPOTS_CAUGHT: -",
        "RECOMMENDATION: auto_reply",
        "ONE_THING_TO_DO_FIRST: auto_reply.",
      ].join("\n"),
    ]);
    const result = await shadowEvaluateHandoff(BASE_INPUT, { llmClient: llm, skipLog: true });
    expect(result.confidence).toBe("high");
  });

  it("scores confidence=low when clashes dominate", async () => {
    const llm = makeLlm([
      "C",
      "X",
      [
        "WHERE_AGREES: -",
        "WHERE_CLASHES: " + "B".repeat(400),
        "BLIND_SPOTS_CAUGHT: -",
        "RECOMMENDATION: handoff",
        "ONE_THING_TO_DO_FIRST: handoff.",
      ].join("\n"),
    ]);
    const result = await shadowEvaluateHandoff(BASE_INPUT, { llmClient: llm, skipLog: true });
    expect(result.confidence).toBe("low");
  });

  it("fails soft: llm error returns ruleDecision as councilDecision", async () => {
    const llm = vi.fn().mockRejectedValue(new Error("stub failure"));
    const result = await shadowEvaluateHandoff(
      { ...BASE_INPUT, ruleDecision: "handoff" },
      { llmClient: llm as any, skipLog: true }
    );
    expect(result.councilDecision).toBe("handoff");
    expect(result.confidence).toBe("low");
    expect(result.reasoning).toMatch(/council-error/);
  });
});
