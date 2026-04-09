import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock env before importing anything that transitively loads it.
// This avoids requireEnv("GOOGLE_AI_API_KEY") throwing during test module load.
vi.stubEnv("GOOGLE_AI_API_KEY", "test-key");
vi.stubEnv("DATABASE_URL", "mysql://test");

// Mock the LLM module so we never make real network calls.
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

// Mock the db module so we don't touch MySQL.
vi.mock("./db", () => ({
  getDb: vi.fn(),
  getConversationById: vi.fn(),
  getMessagesByConversation: vi.fn(),
  updateLeadQualifierVerdict: vi.fn(),
}));

import { runLeadQualifier, __test__ } from "./leadQualifierAgent";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";

const { parseVerdict, stripJsonFence, buildUserPrompt, qualifierCooldownMap } = __test__;

// --- Pure-function tests (no mocks needed) ---

describe("stripJsonFence", () => {
  it("returns plain JSON unchanged", () => {
    expect(stripJsonFence('{"a":1}')).toBe('{"a":1}');
  });

  it("strips ```json fences", () => {
    const fenced = '```json\n{"a":1}\n```';
    expect(stripJsonFence(fenced)).toBe('{"a":1}');
  });

  it("strips bare ``` fences", () => {
    const fenced = '```\n{"a":1}\n```';
    expect(stripJsonFence(fenced)).toBe('{"a":1}');
  });

  it("trims surrounding whitespace", () => {
    expect(stripJsonFence('   {"a":1}  ')).toBe('{"a":1}');
  });
});

describe("parseVerdict", () => {
  const validRaw = JSON.stringify({
    icpScore: 85,
    tier: "hot",
    reasoning: "客戶明確表達購買意願並詢問分期方案",
    buyingSignals: ["詢問頭期款", "想這週看車"],
    risks: ["尚未決定品牌"],
    recommendedAction: "今天撥打電話邀約週末到店試駕",
    draftFollowUp: "哥你好，我是崑家的小王...",
  });

  it("parses a well-formed verdict", () => {
    const v = parseVerdict(validRaw, "gemini-2.5-flash");
    expect(v.icpScore).toBe(85);
    expect(v.tier).toBe("hot");
    expect(v.buyingSignals).toHaveLength(2);
    expect(v.risks).toEqual(["尚未決定品牌"]);
    expect(v.model).toBe("gemini-2.5-flash");
    expect(v.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("accepts fenced JSON from the LLM", () => {
    const fenced = "```json\n" + validRaw + "\n```";
    const v = parseVerdict(fenced, "gemini-2.5-flash");
    expect(v.tier).toBe("hot");
  });

  it("rounds non-integer icpScore", () => {
    const raw = JSON.stringify({ ...JSON.parse(validRaw), icpScore: 74.6 });
    expect(parseVerdict(raw, "m").icpScore).toBe(75);
  });

  it("rejects invalid tier", () => {
    const raw = JSON.stringify({ ...JSON.parse(validRaw), tier: "scorching" });
    expect(() => parseVerdict(raw, "m")).toThrow(/invalid tier/);
  });

  it("rejects out-of-range icpScore", () => {
    const raw = JSON.stringify({ ...JSON.parse(validRaw), icpScore: 150 });
    expect(() => parseVerdict(raw, "m")).toThrow(/invalid icpScore/);
  });

  it("rejects non-array buyingSignals", () => {
    const raw = JSON.stringify({ ...JSON.parse(validRaw), buyingSignals: "nope" });
    expect(() => parseVerdict(raw, "m")).toThrow(/buyingSignals/);
  });

  it("defaults risks to empty array if omitted", () => {
    const partial: any = JSON.parse(validRaw);
    delete partial.risks;
    const v = parseVerdict(JSON.stringify(partial), "m");
    expect(v.risks).toEqual([]);
  });
});

describe("buildUserPrompt", () => {
  it("truncates to the last 30 messages", () => {
    const messages = Array.from({ length: 50 }, (_, i) => ({
      role: "user",
      content: `msg-${i}`,
    }));
    const prompt = buildUserPrompt({
      conversation: { id: 1, channel: "line", leadScore: 50 },
      messages,
    });
    expect(prompt).toContain("最後 30 則");
    expect(prompt).toContain("msg-49");
    expect(prompt).toContain("msg-20");
    expect(prompt).not.toContain("msg-19");
  });

  it("labels roles in Chinese", () => {
    const prompt = buildUserPrompt({
      conversation: { id: 1, channel: "line", leadScore: 50 },
      messages: [
        { role: "user", content: "我想看BMW" },
        { role: "assistant", content: "好的哥" },
      ],
    });
    expect(prompt).toContain("[客戶] 我想看BMW");
    expect(prompt).toContain("[AI] 好的哥");
  });

  it("handles missing customer name gracefully", () => {
    const prompt = buildUserPrompt({
      conversation: { id: 1, channel: "web", leadScore: null },
      messages: [{ role: "user", content: "hi" }],
    });
    expect(prompt).toContain("客戶名稱：未知");
    expect(prompt).toContain("目前規則分數：0");
  });
});

// --- Integration tests for runLeadQualifier with mocks ---

describe("runLeadQualifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    qualifierCooldownMap.clear();
    // Default: DB is available
    (db.getDb as any).mockResolvedValue({} as any);
  });

  afterEach(() => {
    qualifierCooldownMap.clear();
  });

  const validVerdictJson = JSON.stringify({
    icpScore: 72,
    tier: "hot",
    reasoning: "test reasoning",
    buyingSignals: ["signal1"],
    risks: [],
    recommendedAction: "call now",
    draftFollowUp: "hi there",
  });

  const mockLlmResponse = (content: string) => ({
    id: "test",
    created: Date.now(),
    model: "gemini-2.5-flash",
    choices: [{ index: 0, message: { role: "assistant" as const, content }, finish_reason: "stop" }],
  });

  it("skips when DB unavailable", async () => {
    (db.getDb as any).mockResolvedValue(null);
    const result = await runLeadQualifier(1);
    expect(result).toBeNull();
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("skips when conversation not found", async () => {
    (db.getConversationById as any).mockResolvedValue(undefined);
    const result = await runLeadQualifier(1);
    expect(result).toBeNull();
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("skips when leadScore below threshold", async () => {
    (db.getConversationById as any).mockResolvedValue({
      id: 1, leadScore: 20, channel: "line",
    });
    const result = await runLeadQualifier(1);
    expect(result).toBeNull();
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("skips when no messages", async () => {
    (db.getConversationById as any).mockResolvedValue({
      id: 1, leadScore: 50, channel: "line",
    });
    (db.getMessagesByConversation as any).mockResolvedValue([]);
    const result = await runLeadQualifier(1);
    expect(result).toBeNull();
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("runs happy path: calls LLM, parses verdict, writes to DB", async () => {
    (db.getConversationById as any).mockResolvedValue({
      id: 42, leadScore: 85, channel: "line",
      customerName: "Mr. Chen", customerContact: "0912345678",
      interestedVehicleIds: "1,2",
    });
    (db.getMessagesByConversation as any).mockResolvedValue([
      { role: "user", content: "我想買BMW", createdAt: new Date() },
      { role: "assistant", content: "好的哥", createdAt: new Date() },
    ]);
    (invokeLLM as any).mockResolvedValue(mockLlmResponse(validVerdictJson));

    const result = await runLeadQualifier(42);

    expect(result).not.toBeNull();
    expect(result!.icpScore).toBe(72);
    expect(result!.tier).toBe("hot");
    expect(invokeLLM).toHaveBeenCalledTimes(1);
    expect(db.updateLeadQualifierVerdict).toHaveBeenCalledWith(42, expect.objectContaining({
      icpScore: 72,
      tier: "hot",
      model: "gemini-2.5-flash",
    }));
  });

  it("honors cooldown: second call within window is skipped", async () => {
    (db.getConversationById as any).mockResolvedValue({
      id: 7, leadScore: 60, channel: "web",
    });
    (db.getMessagesByConversation as any).mockResolvedValue([
      { role: "user", content: "hi", createdAt: new Date() },
    ]);
    (invokeLLM as any).mockResolvedValue(mockLlmResponse(validVerdictJson));

    await runLeadQualifier(7);
    await runLeadQualifier(7);

    expect(invokeLLM).toHaveBeenCalledTimes(1);
  });

  it("returns null on bad LLM JSON (does not throw)", async () => {
    (db.getConversationById as any).mockResolvedValue({
      id: 3, leadScore: 60, channel: "line",
    });
    (db.getMessagesByConversation as any).mockResolvedValue([
      { role: "user", content: "hi", createdAt: new Date() },
    ]);
    (invokeLLM as any).mockResolvedValue(mockLlmResponse("not valid json at all"));

    const result = await runLeadQualifier(3);
    expect(result).toBeNull();
    expect(db.updateLeadQualifierVerdict).not.toHaveBeenCalled();
  });

  it("returns null on empty LLM content (does not throw)", async () => {
    (db.getConversationById as any).mockResolvedValue({
      id: 4, leadScore: 60, channel: "line",
    });
    (db.getMessagesByConversation as any).mockResolvedValue([
      { role: "user", content: "hi", createdAt: new Date() },
    ]);
    (invokeLLM as any).mockResolvedValue(mockLlmResponse(""));

    const result = await runLeadQualifier(4);
    expect(result).toBeNull();
  });

  it("swallows LLM errors (fire-and-forget contract)", async () => {
    (db.getConversationById as any).mockResolvedValue({
      id: 5, leadScore: 60, channel: "line",
    });
    (db.getMessagesByConversation as any).mockResolvedValue([
      { role: "user", content: "hi", createdAt: new Date() },
    ]);
    (invokeLLM as any).mockRejectedValue(new Error("network down"));

    const result = await runLeadQualifier(5);
    expect(result).toBeNull();
  });
});
