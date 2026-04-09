/**
 * Lead Qualifier Agent
 *
 * Async enrichment layer that runs AFTER the hot-path LINE/web reply is sent.
 * Takes a conversation that has crossed a lead-score milestone, feeds the full
 * message history + context to the existing Gemini LLM, and produces a
 * structured verdict (ICP tier, reasoning, buying signals, draft follow-up)
 * which is overwritten into `conversations.leadQualifierVerdict`.
 *
 * Design principles:
 *   - Fire-and-forget from callers. Never blocks the user-facing reply.
 *   - Idempotent at milestone granularity (cooldown map prevents re-running
 *     within 5 minutes for the same conversation).
 *   - Uses the existing `invokeLLM` (Gemini Flash) — zero new billing.
 *   - Robust to bad JSON: strips code fences and validates shape before write.
 *   - Silent failures: logs errors but never throws into caller scope.
 */

import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { logger } from "./logger";
import type { LeadQualifierVerdict } from "../drizzle/schema";

const LOG_PREFIX = "LeadQualifier";

// Cooldown: don't re-qualify the same conversation more than once per 5 minutes.
// Milestones (50/80/120/180) are typically minutes-to-hours apart, so this
// only deduplicates rapid-fire triggers (e.g. phone detected immediately
// after a score-crossing message).
const QUALIFIER_COOLDOWN_MS = 5 * 60 * 1000;
const qualifierCooldownMap = new Map<number, number>();

// Minimum lead score before we bother running the qualifier.
// Below this, the regex scorer is signal enough and LLM cost isn't justified.
const QUALIFIER_MIN_SCORE = 40;

// Max messages to include in the prompt — trim long conversations to keep
// token cost bounded (~5k in + 500 out ≈ $0.002 / run on Gemini Flash).
const MAX_MESSAGES_IN_PROMPT = 30;

// Valid tier values — used both for the prompt and for validation on parse.
const VALID_TIERS = ["cold", "warm", "hot", "urgent"] as const;

const SYSTEM_PROMPT = `你是崑家汽車（高雄在地中古車商）的資深業務分析師，專門從LINE/網站對話中判斷潛在客戶的購買意願。

你的任務：讀完完整對話後，輸出結構化的潛客評估JSON。

評估維度（參考BANT + SPIN + Sandler）：
1. **預算確認**：有無提到具體金額、分期、頭期款
2. **購買意向**：是否直接表達要買、下訂、成交
3. **時間急迫**：是否有明確時間壓力（這週、這個月、年底前）
4. **看車意願**：是否想預約、到店、試駕
5. **具體車款**：是否問特定車輛規格
6. **生活事件**：結婚/小孩/通勤等剛性需求
7. **聯繫意願**：是否主動提供或索取聯繫方式
8. **舊車換新**：是否有trade-in需求

輸出要求：
- 嚴格輸出JSON，不要markdown code fence，不要額外說明文字
- icpScore: 0-100的整數（這是你的質性評估，可能與規則分數不同）
- tier: cold(0-39) | warm(40-69) | hot(70-89) | urgent(90-100)
- reasoning: 2-4句話說明為什麼給這個分數（繁中）
- buyingSignals: 從對話中實際提取的購買訊號陣列（繁中，每項 ≤20字）
- risks: 猶豫/阻礙/風險陣列（繁中，每項 ≤20字，若無則空陣列）
- recommendedAction: 老闆接下來該做什麼（繁中，1句話，具體可執行）
- draftFollowUp: 可直接傳送的跟進訊息草稿，用「高雄在地老江湖」20年經驗業務的口吻，親切、務實、不浮誇（繁中，≤150字）`;

/**
 * Strip markdown code fences and trim, returning the inner JSON text.
 * Gemini sometimes wraps JSON in ```json ... ``` despite instructions.
 */
function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}

/**
 * Parse + validate the LLM output into a LeadQualifierVerdict.
 * Throws if the shape is invalid (caller logs and swallows).
 */
export function parseVerdict(raw: string, model: string): LeadQualifierVerdict {
  const jsonText = stripJsonFence(raw);
  const parsed = JSON.parse(jsonText);

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("verdict is not an object");
  }

  const icpScore = Number(parsed.icpScore);
  if (!Number.isFinite(icpScore) || icpScore < 0 || icpScore > 100) {
    throw new Error(`invalid icpScore: ${parsed.icpScore}`);
  }

  const tier = String(parsed.tier);
  if (!(VALID_TIERS as readonly string[]).includes(tier)) {
    throw new Error(`invalid tier: ${parsed.tier}`);
  }

  const asStringArray = (v: unknown, field: string): string[] => {
    if (!Array.isArray(v)) throw new Error(`${field} is not an array`);
    return v.map((x) => String(x)).filter((x) => x.length > 0);
  };

  return {
    icpScore: Math.round(icpScore),
    tier: tier as LeadQualifierVerdict["tier"],
    reasoning: String(parsed.reasoning || ""),
    buyingSignals: asStringArray(parsed.buyingSignals ?? [], "buyingSignals"),
    risks: asStringArray(parsed.risks ?? [], "risks"),
    recommendedAction: String(parsed.recommendedAction || ""),
    draftFollowUp: String(parsed.draftFollowUp || ""),
    model,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Build the user-message prompt containing the conversation context.
 * Truncates to the last MAX_MESSAGES_IN_PROMPT messages to bound tokens.
 */
function buildUserPrompt(args: {
  conversation: {
    id: number;
    customerName?: string | null;
    customerContact?: string | null;
    channel: string;
    leadScore: number | null;
    interestedVehicleIds?: string | null;
  };
  messages: Array<{ role: string; content: string; createdAt?: Date }>;
}): string {
  const { conversation, messages } = args;
  const recent = messages.slice(-MAX_MESSAGES_IN_PROMPT);
  const transcript = recent
    .map((m) => {
      const who = m.role === "user" ? "客戶" : m.role === "assistant" ? "AI" : "系統";
      return `[${who}] ${m.content}`;
    })
    .join("\n");

  return [
    `## 對話資訊`,
    `對話ID：${conversation.id}`,
    `客戶名稱：${conversation.customerName || "未知"}`,
    `聯繫方式：${conversation.customerContact || "未提供"}`,
    `來源渠道：${conversation.channel}`,
    `目前規則分數：${conversation.leadScore ?? 0}`,
    `感興趣車輛ID：${conversation.interestedVehicleIds || "未指定"}`,
    ``,
    `## 最近對話（最後 ${recent.length} 則）`,
    transcript || "(無訊息)",
    ``,
    `請根據以上對話輸出評估JSON。`,
  ].join("\n");
}

/**
 * Run the lead qualifier for a single conversation.
 * Fire-and-forget safe: catches all errors internally and logs them.
 *
 * @returns the verdict if successfully generated and persisted, or null on any
 *          failure (cooldown, DB error, LLM error, parse error).
 */
export async function runLeadQualifier(
  conversationId: number
): Promise<LeadQualifierVerdict | null> {
  try {
    // Cooldown check — prevents rapid-fire re-qualification.
    const lastRun = qualifierCooldownMap.get(conversationId);
    if (lastRun && Date.now() - lastRun < QUALIFIER_COOLDOWN_MS) {
      logger.info(LOG_PREFIX, `skip ${conversationId}: cooldown`);
      return null;
    }

    // Load conversation + messages.
    const db_ = await db.getDb();
    if (!db_) {
      logger.warn(LOG_PREFIX, `skip ${conversationId}: DB unavailable`);
      return null;
    }

    const conv = await db.getConversationById(conversationId);
    if (!conv) {
      logger.warn(LOG_PREFIX, `skip ${conversationId}: conversation not found`);
      return null;
    }

    const score = conv.leadScore ?? 0;
    if (score < QUALIFIER_MIN_SCORE) {
      logger.info(LOG_PREFIX, `skip ${conversationId}: score ${score} < ${QUALIFIER_MIN_SCORE}`);
      return null;
    }

    const messages = await db.getMessagesByConversation(conversationId, 100);
    if (messages.length === 0) {
      logger.warn(LOG_PREFIX, `skip ${conversationId}: no messages`);
      return null;
    }

    // Mark cooldown BEFORE the LLM call so a slow/hung call still prevents duplicates.
    qualifierCooldownMap.set(conversationId, Date.now());
    // Periodic cleanup of expired entries.
    if (qualifierCooldownMap.size > 500) {
      const now = Date.now();
      Array.from(qualifierCooldownMap.entries()).forEach(([k, t]) => {
        if (now - t > QUALIFIER_COOLDOWN_MS) qualifierCooldownMap.delete(k);
      });
    }

    const userPrompt = buildUserPrompt({
      conversation: {
        id: conv.id,
        customerName: conv.customerName,
        customerContact: conv.customerContact,
        channel: conv.channel,
        leadScore: conv.leadScore,
        interestedVehicleIds: conv.interestedVehicleIds,
      },
      messages: messages.map((m) => ({ role: m.role, content: m.content, createdAt: m.createdAt })),
    });

    logger.info(LOG_PREFIX, `running for conversation ${conversationId} (score ${score})`);

    const llmResult = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      maxTokens: 1024,
    });

    const rawContent = llmResult.choices[0]?.message?.content;
    const rawText = typeof rawContent === "string"
      ? rawContent
      : Array.isArray(rawContent)
        ? rawContent.map((p) => (p && "type" in p && p.type === "text" ? p.text : "")).join("")
        : "";

    if (!rawText) {
      logger.error(LOG_PREFIX, `empty LLM response for conversation ${conversationId}`);
      return null;
    }

    const verdict = parseVerdict(rawText, llmResult.model || "gemini-2.5-flash");

    await db.updateLeadQualifierVerdict(conversationId, verdict);

    logger.info(
      LOG_PREFIX,
      `conversation ${conversationId} -> tier=${verdict.tier} icpScore=${verdict.icpScore}`
    );

    return verdict;
  } catch (err) {
    logger.error(LOG_PREFIX, `failed for conversation ${conversationId}`, err);
    return null;
  }
}

/**
 * Fire-and-forget wrapper. Call this from hot paths (webhook, route handlers)
 * after sending the reply. Never awaits, never throws.
 */
export function maybeRunLeadQualifier(conversationId: number): void {
  // Intentional void — do not await, do not propagate errors.
  void runLeadQualifier(conversationId).catch(() => {
    /* already logged inside runLeadQualifier */
  });
}

// Exposed for tests only.
export const __test__ = {
  parseVerdict,
  stripJsonFence,
  buildUserPrompt,
  qualifierCooldownMap,
  QUALIFIER_MIN_SCORE,
  QUALIFIER_COOLDOWN_MS,
};
