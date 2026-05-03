/**
 * Phase-2 Phone Ask — unit tests for shouldAskForPhone + buildPhoneAskInstruction.
 *
 * What this proves
 * ----------------
 * The phone-ask gate is a pure function over (channel, leadScore,
 * customerContact, recentMessages). All four conditions are AND-ed; any one
 * failing must short-circuit. These tests cover positive + negative paths for
 * each condition plus an integration test against buildPhoneAskInstruction so
 * the prompt fragment shape is locked.
 *
 * Style mirrors factLock.test.ts:
 *   - Vitest describe / it blocks grouped by concern
 *   - Plain-language test names that double as the spec
 *   - Each test pins exactly one behavior (no compound assertions where
 *     possible)
 *
 * Related: server/phoneAsk.ts; PR #92 (suppression rule that this is the
 * positive-action follow-up to); docs/PROJECT_JOURNAL.md (2026-05-02 entry).
 */

import { describe, it, expect } from "vitest";
import {
  shouldAskForPhone,
  buildPhoneAskInstruction,
  hasRecentAssistantAsk,
  PHONE_ASK_SCORE_THRESHOLD,
  type PhoneAskContext,
} from "./phoneAsk";

// ============================================================
// Helpers
// ============================================================

function ctx(overrides: Partial<PhoneAskContext> = {}): PhoneAskContext {
  return {
    channel: "web",
    leadScore: 50,
    customerContact: null,
    recentMessages: [],
    ...overrides,
  };
}

const userMsg = (content: string) => ({ role: "user" as const, content });
const aiMsg = (content: string) => ({ role: "assistant" as const, content });

// ============================================================
// SECTION 1: Threshold constant — single source of truth
// ============================================================

describe("PHONE_ASK_SCORE_THRESHOLD — qualified-lead boundary", () => {
  it("matches the QUALITY_LEAD_THRESHOLD (50) used by routers.ts notification logic", () => {
    // If these ever drift apart, the phone ask might fire on visitors who
    // wouldn't generate a notification, or vice versa — keep them aligned.
    expect(PHONE_ASK_SCORE_THRESHOLD).toBe(50);
  });
});

// ============================================================
// SECTION 2: Positive path — all four conditions met
// ============================================================

describe("shouldAskForPhone — fires when all conditions met (positive path)", () => {
  it("fires for web visitor at score 50 with no contact and no prior ask", () => {
    expect(
      shouldAskForPhone(
        ctx({
          channel: "web",
          leadScore: 50,
          customerContact: null,
          recentMessages: [
            userMsg("這台 Tucson 多少錢？"),
            aiMsg("Tucson 2016年款售價29萬，車況很好喔！"),
            userMsg("我預算30萬左右想看看"),
          ],
        }),
      ),
    ).toBe(true);
  });

  it("fires at score well above threshold (80)", () => {
    expect(
      shouldAskForPhone(
        ctx({
          channel: "web",
          leadScore: 80,
          customerContact: null,
          recentMessages: [aiMsg("這台車況很實在，您可以來看看")],
        }),
      ),
    ).toBe(true);
  });

  it("fires when there is no conversation history yet (score 50 first message)", () => {
    // Edge case: user types one strong-intent message and immediately hits
    // score 50. No assistant turns yet to scan for prior asks.
    expect(
      shouldAskForPhone(
        ctx({
          channel: "web",
          leadScore: 50,
          customerContact: null,
          recentMessages: [userMsg("我想買 Tucson 預算30萬要分期")],
        }),
      ),
    ).toBe(true);
  });
});

// ============================================================
// SECTION 3: Channel gate — LINE / facebook / etc must not trigger
// ============================================================

describe("shouldAskForPhone — channel gate (web only)", () => {
  it("does NOT fire on LINE channel (LINE has built-in identity)", () => {
    // LINE userId is captured at follow time — we already have a push channel.
    // Asking for phone there is redundant and clutters the conversation.
    expect(
      shouldAskForPhone(
        ctx({
          channel: "line",
          leadScore: 100,
          customerContact: null,
          recentMessages: [],
        }),
      ),
    ).toBe(false);
  });

  it("does NOT fire on facebook channel", () => {
    expect(
      shouldAskForPhone(
        ctx({ channel: "facebook", leadScore: 80, customerContact: null }),
      ),
    ).toBe(false);
  });

  it("does NOT fire on youtube channel", () => {
    expect(
      shouldAskForPhone(
        ctx({ channel: "youtube", leadScore: 80, customerContact: null }),
      ),
    ).toBe(false);
  });

  it("does NOT fire on the catch-all 'other' channel", () => {
    expect(
      shouldAskForPhone(
        ctx({ channel: "other", leadScore: 80, customerContact: null }),
      ),
    ).toBe(false);
  });
});

// ============================================================
// SECTION 4: Score gate — below threshold must not trigger
// ============================================================

describe("shouldAskForPhone — score gate (>= 50 required)", () => {
  it("does NOT fire at score 0 (fresh visitor)", () => {
    expect(
      shouldAskForPhone(ctx({ leadScore: 0, customerContact: null })),
    ).toBe(false);
  });

  it("does NOT fire at score 49 (one point below threshold)", () => {
    // Boundary check — anything < 50 must not fire.
    expect(
      shouldAskForPhone(ctx({ leadScore: 49, customerContact: null })),
    ).toBe(false);
  });

  it("does NOT fire when leadScore is null (uncomputed)", () => {
    expect(
      shouldAskForPhone(ctx({ leadScore: null, customerContact: null })),
    ).toBe(false);
  });

  it("does NOT fire when leadScore is undefined", () => {
    expect(
      shouldAskForPhone(ctx({ leadScore: undefined, customerContact: null })),
    ).toBe(false);
  });
});

// ============================================================
// SECTION 5: Contact gate — already-have-phone must not re-ask
// ============================================================

describe("shouldAskForPhone — contact gate (no phone in DB)", () => {
  it("does NOT fire when customerContact is set to a phone number", () => {
    // We already have it — asking again would feel pushy and look broken.
    expect(
      shouldAskForPhone(
        ctx({
          leadScore: 80,
          customerContact: "0936-812-818",
        }),
      ),
    ).toBe(false);
  });

  it("does NOT fire when customerContact is set even at very high score", () => {
    expect(
      shouldAskForPhone(
        ctx({
          leadScore: 200,
          customerContact: "0900000000",
        }),
      ),
    ).toBe(false);
  });

  it("DOES fire when customerContact is an empty string (treat as missing)", () => {
    // Drizzle may return "" for VARCHARs that were never written. An empty
    // string is functionally "no phone" and the ask should still fire.
    expect(
      shouldAskForPhone(
        ctx({ leadScore: 50, customerContact: "" }),
      ),
    ).toBe(true);
  });

  it("DOES fire when customerContact is whitespace-only", () => {
    // Defensive — manual data entry might leave spaces. Treat as empty.
    expect(
      shouldAskForPhone(
        ctx({ leadScore: 50, customerContact: "   " }),
      ),
    ).toBe(true);
  });
});

// ============================================================
// SECTION 6: Recency gate — already asked recently must not repeat
// ============================================================

describe("shouldAskForPhone — recency gate (no repeat within 5 turns)", () => {
  it("does NOT fire when last assistant turn already asked '電話'", () => {
    // Most common keyword — direct phone ask phrasing.
    expect(
      shouldAskForPhone(
        ctx({
          leadScore: 60,
          recentMessages: [
            userMsg("我想看 Tucson"),
            aiMsg("Tucson 售價29萬！方便留個電話嗎？業務直接打給你比較快！"),
            userMsg("好"),
          ],
        }),
      ),
    ).toBe(false);
  });

  it("does NOT fire when assistant said '聯絡' (less direct phrasing)", () => {
    expect(
      shouldAskForPhone(
        ctx({
          leadScore: 60,
          recentMessages: [
            aiMsg("方便給我聯絡方式嗎？我請業務跟你說明！"),
          ],
        }),
      ),
    ).toBe(false);
  });

  it("does NOT fire when assistant used '聯繫方式' phrasing", () => {
    expect(
      shouldAskForPhone(
        ctx({
          leadScore: 60,
          recentMessages: [aiMsg("可以給我聯繫方式嗎？")],
        }),
      ),
    ).toBe(false);
  });

  it("does NOT fire when assistant asked for '號碼'", () => {
    expect(
      shouldAskForPhone(
        ctx({
          leadScore: 60,
          recentMessages: [aiMsg("人客留個號碼吧，業務馬上聯繫你")],
        }),
      ),
    ).toBe(false);
  });

  it("DOES fire when prior ask was more than 5 assistant turns ago", () => {
    // After 5+ turns of nudge-free conversation, a single follow-up ask is
    // acceptable per the soft policy.
    const old = aiMsg("方便留個電話嗎？");
    const filler = (i: number) => [
      userMsg(`再問一下 ${i}`),
      aiMsg(`好的這台車${i}萬左右`),
    ];
    expect(
      shouldAskForPhone(
        ctx({
          leadScore: 60,
          recentMessages: [
            old,
            ...filler(1),
            ...filler(2),
            ...filler(3),
            ...filler(4),
            ...filler(5),
            userMsg("還想多看幾台"),
          ],
        }),
      ),
    ).toBe(true);
  });

  it("DOES fire when only USER messages mention 電話 (customer asking OUR number)", () => {
    // Suppression must only fire on assistant turns. If the customer asked
    // "你們電話多少?" we still need to ask THEIRS — those aren't symmetric.
    expect(
      shouldAskForPhone(
        ctx({
          leadScore: 60,
          recentMessages: [
            userMsg("你們的電話是多少？"),
            aiMsg("0936-812-818 賴先生"),
          ],
        }),
      ),
    ).toBe(true);
    // ↑ The assistant turn here gives OUR phone but does not ASK for
    //   the customer's. Word "電話" appears in user turn only.
    //   Wait — assistant content "0936-812-818 賴先生" does NOT contain any
    //   PHONE_ASK_KEYWORDS substring (電話/聯絡/聯繫方式/號碼) → no
    //   suppression. This is the correct desired behavior.
  });
});

// ============================================================
// SECTION 7: hasRecentAssistantAsk — direct unit test
// ============================================================

describe("hasRecentAssistantAsk — keyword scan", () => {
  it("returns false for empty history", () => {
    expect(hasRecentAssistantAsk([])).toBe(false);
  });

  it("returns false when no assistant message contains keywords", () => {
    expect(
      hasRecentAssistantAsk([
        userMsg("hi"),
        aiMsg("人客你好！想看什麼車？"),
        userMsg("Tucson"),
        aiMsg("Tucson 29萬"),
      ]),
    ).toBe(false);
  });

  it("returns true when only the most-recent assistant message has '電話'", () => {
    expect(
      hasRecentAssistantAsk([
        aiMsg("方便留個電話嗎？"),
      ]),
    ).toBe(true);
  });

  it("returns true when an older-but-within-5-turns assistant message asked", () => {
    // 4 assistant turns back — still inside the lookback window.
    expect(
      hasRecentAssistantAsk([
        aiMsg("可以給我聯絡方式嗎？"),
        userMsg("等等"),
        aiMsg("好"),
        userMsg("Tucson 多少錢"),
        aiMsg("29萬"),
        userMsg("有貸款嗎"),
        aiMsg("有的，可以填單"),
        userMsg("好"),
        aiMsg("沒問題！"),
      ]),
    ).toBe(true);
  });

  it("returns false when ask is OLDER than the 5-turn lookback window", () => {
    // 6 assistant turns since the ask — should no longer suppress.
    const ask = aiMsg("方便留個電話嗎？");
    const filler = (i: number) => [userMsg(`q${i}`), aiMsg(`a${i}`)];
    expect(
      hasRecentAssistantAsk([
        ask,
        ...filler(1),
        ...filler(2),
        ...filler(3),
        ...filler(4),
        ...filler(5),
        ...filler(6),
      ]),
    ).toBe(false);
  });
});

// ============================================================
// SECTION 8: buildPhoneAskInstruction — prompt-fragment integration
// ============================================================

describe("buildPhoneAskInstruction — output shape", () => {
  it("returns empty string when shouldAskForPhone is false (no-op concat)", () => {
    // Caller pattern: `prompt += buildPhoneAskInstruction(ctx)`. Empty string
    // means "no change" — the call site doesn't need a branch.
    expect(
      buildPhoneAskInstruction(ctx({ leadScore: 0 })),
    ).toBe("");
  });

  it("returns non-empty Mandarin instruction when conditions are met", () => {
    const out = buildPhoneAskInstruction(
      ctx({ leadScore: 60, customerContact: null }),
    );
    expect(out.length).toBeGreaterThan(50);
    expect(out).toContain("索取電話");
    // Soft-tone marker — the heading explicitly says "自然地問電話一次"
    expect(out).toContain("自然地");
    expect(out).toContain("一次");
  });

  it("includes the soft-tone example phrasing the spec calls out", () => {
    // The Megan/Jerry-quoted phrasing must be present as a tone reference
    // (NOT as a verbatim template — the prompt explicitly invites the LLM to
    // paraphrase, but the canonical example is in there).
    const out = buildPhoneAskInstruction(
      ctx({ leadScore: 60, customerContact: null }),
    );
    expect(out).toContain("方便留個電話嗎");
    expect(out).toContain("折抵");
  });

  it("prohibits a second ask in the same turn (規則: 只問一次)", () => {
    // Locks in the rule that the LLM must not double-up. Visible as part of
    // the prompt — if this ever gets removed accidentally, the test catches it.
    const out = buildPhoneAskInstruction(
      ctx({ leadScore: 60, customerContact: null }),
    );
    expect(out).toContain("只問一次");
  });

  it("returns empty for LINE channel even at high score (gate path)", () => {
    expect(
      buildPhoneAskInstruction(ctx({ channel: "line", leadScore: 200 })),
    ).toBe("");
  });

  it("returns empty when customer already has a phone (gate path)", () => {
    expect(
      buildPhoneAskInstruction(
        ctx({ leadScore: 100, customerContact: "0900000000" }),
      ),
    ).toBe("");
  });
});

// ============================================================
// SECTION 9: Cross-condition matrix (one of each gate fails)
// ============================================================

describe("shouldAskForPhone — cross-condition matrix", () => {
  // Locks in that EACH gate independently disables the ask. If anyone
  // re-orders the && chain or accidentally turns one into ||, at least one
  // of these fails.
  it("score 60 + LINE + no contact + no ask → false (channel)", () => {
    expect(
      shouldAskForPhone(
        ctx({ channel: "line", leadScore: 60, customerContact: null }),
      ),
    ).toBe(false);
  });

  it("score 30 + web + no contact + no ask → false (score)", () => {
    expect(
      shouldAskForPhone(
        ctx({ channel: "web", leadScore: 30, customerContact: null }),
      ),
    ).toBe(false);
  });

  it("score 60 + web + has contact + no ask → false (contact)", () => {
    expect(
      shouldAskForPhone(
        ctx({
          channel: "web",
          leadScore: 60,
          customerContact: "0900000000",
        }),
      ),
    ).toBe(false);
  });

  it("score 60 + web + no contact + recent ask → false (recency)", () => {
    expect(
      shouldAskForPhone(
        ctx({
          channel: "web",
          leadScore: 60,
          customerContact: null,
          recentMessages: [aiMsg("方便留個電話嗎？")],
        }),
      ),
    ).toBe(false);
  });

  it("score 60 + web + no contact + no recent ask → true (all green)", () => {
    expect(
      shouldAskForPhone(
        ctx({
          channel: "web",
          leadScore: 60,
          customerContact: null,
          recentMessages: [
            userMsg("Tucson 多少？"),
            aiMsg("29萬"),
          ],
        }),
      ),
    ).toBe(true);
  });
});
