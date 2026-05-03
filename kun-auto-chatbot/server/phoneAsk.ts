/**
 * Phase-2 Phone Ask — soft prompt nudge for anonymous web visitors.
 *
 * Problem this solves
 * -------------------
 * Web channel = anonymous browser visitors via /chat (sessionId in localStorage,
 * no LINE userId, no push channel). If they don't volunteer a phone number we
 * cannot contact them at all — the lead is structurally unactionable.
 *
 * PR #92 (2026-05-02) suppressed the noisy "Score: 50, 客戶名稱：未知, 電話：未提供"
 * notification when there was no contact. That fixed the symptom (operator
 * fatigue) but not the cause: those visitors are still leaving without us
 * knowing how to reach them.
 *
 * Phase-2 fix (this file): when a web visitor's lead score reaches the quality
 * threshold (≥ 50) AND they haven't shared a phone yet AND we haven't already
 * asked them recently, inject a short instruction at the END of the system
 * prompt asking the LLM to naturally request a phone in this turn.
 *
 * Design choices
 * --------------
 * - Channel-gated: web only. LINE has built-in userId / push channel; asking
 *   for a phone there adds no value and clutters the chat.
 * - Score-gated: only at score >= 50 (BANT-equivalent qualified intent). Avoids
 *   asking every casual browser.
 * - Self-suppressing: scans the last few assistant turns for phone-ask keywords
 *   (電話 / 聯絡 / 聯繫方式 / 號碼). One ask per ~5 turns max.
 * - Prompt-only, no DB migration: we infer "have we asked recently?" from the
 *   conversation history that's already in memory at LLM-call time.
 * - Tone-matching: instruction tells the LLM to ask softly, in 老闆 / 中古車
 *   / 高雄 dealership tone. We do NOT script the exact wording — we let Gemini
 *   phrase it naturally based on the current context (the example phrasing is
 *   provided as a tone reference, not a verbatim template).
 *
 * Why not a DB migration with a `phoneAskedAt` column?
 * ----------------------------------------------------
 * Operational complexity (schema change + migrations + idempotent
 * runMigrations() update) for very little gain — we already have the message
 * history loaded in the chat handler, so a regex scan over it is cheaper and
 * more accurate (it matches what the LLM actually said, not what we intended
 * to set as a flag).
 *
 * Related: docs/PROJECT_JOURNAL.md (2026-05-02 entry) — context on the web
 * lead notification fixes that this builds on.
 */

/**
 * Substrings in a recent assistant message that mean "we have already asked
 * the customer for their phone number, do not ask again this turn".
 *
 * Intentionally narrow:
 *   - "電話" / "號碼" / "聯絡" / "聯繫方式" cover the natural phrasings the
 *     LLM uses when it asks for a contact number. ("方便留個電話嗎?",
 *     "你的電話是?", "可以給我聯絡方式嗎?", "留個號碼", etc.)
 *   - We do NOT match "店電話" / SHOP_PHONE — those are us giving OUR number
 *     to the customer, not asking for theirs. Mention of SHOP_PHONE alone
 *     should not suppress the ask.
 */
const PHONE_ASK_KEYWORDS: readonly string[] = [
  "電話",
  "聯絡",
  "聯繫方式",
  "號碼",
] as const;

/**
 * How many recent assistant turns to scan when checking "did we ask already?".
 * Effectively means: one ask per ~5 user turns (because each user turn produces
 * one assistant turn). Tuned to keep it soft, per spec.
 */
const ASK_LOOKBACK_TURNS = 5;

/**
 * Lead score threshold that gates the phone ask. Mirrors QUALITY_LEAD_THRESHOLD
 * in routers.ts (kept as a literal here to avoid a circular import; if either
 * value moves, update both — the factLock-style cross-check tests in
 * phoneAsk.test.ts pin this down).
 */
export const PHONE_ASK_SCORE_THRESHOLD = 50;

export type ChatChannel = "web" | "line" | "facebook" | "youtube" | "other";

export interface PhoneAskContext {
  /** Communication channel for this conversation. */
  channel: ChatChannel | string;
  /** Current cumulative lead score for the conversation. */
  leadScore: number | null | undefined;
  /** Customer's saved phone number, if we already have one. */
  customerContact: string | null | undefined;
  /**
   * Recent messages from the conversation, oldest-first. Only the assistant
   * messages within the last `ASK_LOOKBACK_TURNS` turns are scanned for prior
   * phone-ask phrases. We tolerate a `role` of any string so callers don't
   * have to narrow types just to call us.
   */
  recentMessages: ReadonlyArray<{ role: string; content: string }>;
}

/**
 * Returns true when the AI should naturally ask for the customer's phone
 * number on this turn. All four conditions must hold:
 *
 *   1. Channel is "web" (LINE has identity built in).
 *   2. Lead score is >= PHONE_ASK_SCORE_THRESHOLD (qualified intent).
 *   3. We don't already have a phone number for this customer.
 *   4. We haven't asked in any of the last ASK_LOOKBACK_TURNS assistant turns.
 *
 * If any one fails, returns false. This function is the single decision point
 * — the prompt-injection helper below calls it.
 */
export function shouldAskForPhone(ctx: PhoneAskContext): boolean {
  // (1) Channel gate — web only.
  if (ctx.channel !== "web") return false;

  // (2) Score gate — qualified intent only.
  const score = ctx.leadScore ?? 0;
  if (score < PHONE_ASK_SCORE_THRESHOLD) return false;

  // (3) Already have a contact — nothing to ask for.
  if (ctx.customerContact && ctx.customerContact.trim().length > 0) return false;

  // (4) Already asked recently — don't repeat.
  if (hasRecentAssistantAsk(ctx.recentMessages)) return false;

  return true;
}

/**
 * Scans the most recent assistant messages for a phone-ask keyword. Looks at
 * the last `ASK_LOOKBACK_TURNS` assistant messages only — a single phone-ask
 * suppresses the next ~5 turns of asks, after which the AI may try once more.
 *
 * Exported for testability.
 */
export function hasRecentAssistantAsk(
  messages: ReadonlyArray<{ role: string; content: string }>,
): boolean {
  // Walk backwards, picking up to ASK_LOOKBACK_TURNS assistant messages.
  let scanned = 0;
  for (let i = messages.length - 1; i >= 0 && scanned < ASK_LOOKBACK_TURNS; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    scanned++;
    const text = m.content || "";
    for (const kw of PHONE_ASK_KEYWORDS) {
      if (text.includes(kw)) return true;
    }
  }
  return false;
}

/**
 * Builds the prompt fragment to append at the END of the web system prompt.
 * Returns an empty string when `shouldAskForPhone` is false, so callers can
 * unconditionally concatenate the result without branching.
 *
 * The fragment instructs the LLM (in Mandarin, in the existing 老闆 / 中古車
 * dealership register) to add ONE soft phone-ask sentence at the end of this
 * turn's reply. It deliberately avoids scripting the exact wording — Gemini
 * phrases it based on conversation context.
 */
export function buildPhoneAskInstruction(ctx: PhoneAskContext): string {
  if (!shouldAskForPhone(ctx)) return "";

  // Tone alignment notes (kept inside the prompt so future LLM-tuning passes
  // can find them):
  //   - Use 「方便留個電話嗎?」 register — soft, optional, not a demand.
  //   - Frame the ask in terms of the customer's benefit ("業務直接幫你估折抵 /
  //     直接打給你比較快"), not ours.
  //   - One mention max — the recency-bias check upstream guarantees this is
  //     not a repeat ask, so the LLM should NOT hedge with "再次".
  return `
## 📞 索取電話時機（這次回覆請自然地問電話一次）📞

客人現在的購買意願明確（Lead Score ≥ ${PHONE_ASK_SCORE_THRESHOLD}），但還沒留電話。網站客服沒辦法主動聯繫客人，所以這次回覆的「最後一句」請自然地請客人留個電話 —— 用客人的利益當理由，例如：
- 「方便留個電話嗎？我請業務直接幫你估折抵價，比這裡聊更精準！」
- 「人客要不要留個電話？這樣業務可以直接打給你確認，比較快啦！」

🔴 規則：
- 只問一次，這次回覆問完就好，不要重複「再次」之類的字眼
- 用問句、不要命令式
- 維持高雄阿家的口吻：親切、不拍馬屁、不卑不亢
- 先回答客人的問題、再問電話 —— 不要把「問電話」當成主要回答
- 客人不留也沒關係，下幾輪再說，不要追問
`;
}
