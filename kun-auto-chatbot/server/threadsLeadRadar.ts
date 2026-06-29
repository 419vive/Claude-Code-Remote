/**
 * Threads Lead Radar (人在迴路 / human-in-the-loop)
 * ============================================================
 * Goal: surface public Threads posts where someone is looking to BUY a used
 * car, draft a short friendly recommendation for 崑家汽車, and push it to the
 * operators (Jerry + Megan) over LINE so a HUMAN reviews and replies manually
 * in the Threads app.
 *
 * Compliance design (see PROJECT_JOURNAL 2026-06-xx):
 *  - DISCOVERY is done by reading PUBLIC posts via a third-party Threads
 *    keyword-search API (Apify / EnsembleData). We never use the dealership's
 *    Meta credentials to scrape, and we never auto-reply to strangers.
 *  - The reply is always written/posted by a human in the Threads app. This
 *    keeps us clear of Meta's automation + unsolicited-outreach rules.
 *  - Entirely env-gated: with no THREADS_SEARCH_API_KEY the radar is inert and
 *    does not touch any existing behaviour.
 *
 * This module is intentionally split into PURE helpers (intent filter, dedupe,
 * prompt + message builders — all unit-tested, no network) and thin IMPURE
 * edges (the vendor fetch, the Gemini draft call, the LINE push).
 */

import { getOperatorUserIds } from "./lineUtils";
import { logger } from "./logger";
import { SHOP_NAME, SHOP_PHONE } from "../shared/shopConfig";

export const WEBSITE_URL = process.env.BASE_URL || "https://claude-code-remote-production.up.railway.app";

// ============ TYPES ============

export interface ThreadsPost {
  id: string;
  text: string;
  url: string; // permalink to the post
  username: string;
  timestamp: string; // ISO-8601 or epoch-ish string from the vendor
}

export interface RadarRunSummary {
  enabled: boolean;
  scanned: number;
  matched: number;
  notified: number;
}

// ============ KEYWORDS + BUY-INTENT FILTER (pure) ============

/** Phrases that signal someone wants to BUY / find a (used) car. */
export const BUY_INTENT_KEYWORDS = [
  "中古車", "二手車", "想買車", "想買台車", "找車", "求車", "換車", "想換車",
  "代步車", "想入手", "想購入", "預算", "推薦車", "新手買車", "人生第一台車",
  "通勤車", "家庭房車", "求推薦", "看車", "買車",
];

/** Phrases that mean the poster is SELLING / a dealer — exclude these. */
export const SELLER_EXCLUDE_KEYWORDS = [
  "賣車", "售車", "出售", "讓車", "割愛", "自售", "誠可議", "車行直營",
  "實價刊登", "降價出售", "便宜賣", "急售", "釋出", "出讓",
];

/**
 * True when the text reads like a buyer looking for a car AND not a seller.
 * Conservative on both sides: needs at least one buy keyword, and is rejected
 * if any seller keyword appears (sellers often also say "中古車").
 */
export function isBuyIntent(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const t = text.toLowerCase();
  const hasBuy = BUY_INTENT_KEYWORDS.some((k) => t.includes(k.toLowerCase()));
  if (!hasBuy) return false;
  const looksLikeSeller = SELLER_EXCLUDE_KEYWORDS.some((k) => t.includes(k.toLowerCase()));
  return !looksLikeSeller;
}

// ============ CONFIG (env) ============

/** Radar only runs when a third-party search API key is configured. */
export function isRadarEnabled(): boolean {
  return Boolean(process.env.THREADS_SEARCH_API_KEY);
}

const DEFAULT_KEYWORDS = ["中古車 推薦", "二手車 推薦", "想買車", "找車 預算", "新手 買車"];

/** Keywords to query the vendor with (comma-separated env override). */
export function getSearchKeywords(): string[] {
  const raw = process.env.THREADS_SEARCH_KEYWORDS;
  if (!raw) return DEFAULT_KEYWORDS;
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return list.length ? list : DEFAULT_KEYWORDS;
}

// ============ VENDOR FETCH (impure — Apify run-sync) ============

/**
 * Normalise one raw vendor item into a ThreadsPost. Different Apify actors /
 * EnsembleData shapes name fields differently, so we accept common variants.
 * Returns null when the item lacks an id or text.
 */
export function normalizeVendorItem(raw: any): ThreadsPost | null {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id ?? raw.pk ?? raw.code ?? raw.postId ?? raw.shortcode ?? "").trim();
  const text = String(raw.text ?? raw.caption ?? raw.content ?? raw.post_text ?? "").trim();
  if (!id || !text) return null;
  const username = String(
    raw.username ?? raw.ownerUsername ?? raw.user?.username ?? raw.owner?.username ?? "",
  ).trim();
  const url = String(
    raw.url ?? raw.permalink ?? raw.postUrl ?? raw.link ??
    (username && id ? `https://www.threads.net/@${username}/post/${id}` : ""),
  ).trim();
  const timestamp = String(
    raw.timestamp ?? raw.takenAt ?? raw.taken_at ?? raw.publishedAt ?? raw.createdAt ?? raw.created_at ?? "",
  ).trim();
  return { id, text, url, username, timestamp };
}

/**
 * Query the third-party Threads keyword-search API for one keyword.
 * Default provider is Apify's run-sync-get-dataset-items endpoint; the actor id
 * and any extra input come from env so the dealership can swap actors without a
 * code change. Returns [] on any failure (radar must never throw into the loop).
 */
export async function fetchThreadsPosts(keyword: string): Promise<ThreadsPost[]> {
  const token = process.env.THREADS_SEARCH_API_KEY;
  if (!token) return [];
  const actor = process.env.THREADS_SEARCH_ACTOR || "";
  if (!actor) {
    logger.warn("ThreadsRadar", "THREADS_SEARCH_ACTOR not set — cannot query vendor");
    return [];
  }

  // Apify actor ids use "user~actor" in the URL path.
  const actorPath = actor.replace("/", "~");
  const url = `https://api.apify.com/v2/acts/${actorPath}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;

  let extra: Record<string, unknown> = {};
  if (process.env.THREADS_SEARCH_EXTRA_INPUT) {
    try { extra = JSON.parse(process.env.THREADS_SEARCH_EXTRA_INPUT); } catch { /* ignore bad json */ }
  }
  const keywordField = process.env.THREADS_SEARCH_KEYWORD_FIELD || "keyword";
  const input = { [keywordField]: keyword, maxItems: 25, ...extra };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      logger.warn("ThreadsRadar", `Vendor returned ${res.status} for "${keyword}"`);
      return [];
    }
    const data = await res.json();
    const items: any[] = Array.isArray(data) ? data : data?.items || [];
    return items.map(normalizeVendorItem).filter((p): p is ThreadsPost => p !== null);
  } catch (err: any) {
    logger.warn("ThreadsRadar", `Vendor fetch failed for "${keyword}": ${err?.message || err}`);
    return [];
  }
}

// ============ DEDUPE (pure) ============

/**
 * Decide whether a post is worth notifying about: not seen before, and recent
 * enough to still be actionable. `seen` is the caller's id set (mutated by the
 * caller after a successful notify).
 */
export function shouldNotify(
  post: ThreadsPost,
  seen: Set<string>,
  nowMs: number,
  lookbackHours: number,
): boolean {
  if (!post.id || seen.has(post.id)) return false;
  const ts = Date.parse(post.timestamp);
  if (!Number.isNaN(ts)) {
    const ageMs = nowMs - ts;
    if (ageMs > lookbackHours * 60 * 60 * 1000) return false;
    if (ageMs < -60 * 60 * 1000) return false; // clock-skew guard (>1h in the future)
  }
  // Unparseable timestamp → don't block on recency; dedupe still applies.
  return true;
}

// ============ DRAFT REPLY (pure prompt + impure LLM) ============

/** Pure: the Gemini prompt used to draft a reply for a given post. */
export function buildLeadDraftPrompt(post: ThreadsPost): string {
  return [
    `你是高雄${SHOP_NAME}的小編。下面是 Threads 上一則公開貼文,看起來有人想買中古車。`,
    `請寫一則「真人留言」風格、親切、不像罐頭廣告的回覆草稿(繁體中文,1-3 句,可用 1 個表情符號),`,
    `自然地推薦${SHOP_NAME}、附上官網 ${WEBSITE_URL} ,並留電話 ${SHOP_PHONE}。`,
    `不要過度推銷、不要誇大、不要保證、不要編造車輛或價格;先回應對方的需求再帶到我們。`,
    ``,
    `對方貼文:「${post.text.slice(0, 500)}」`,
    ``,
    `只輸出留言文字本身,不要加任何說明或引號。`,
  ].join("\n");
}

/** Pure fallback reply when the LLM is unavailable. */
export function fallbackLeadReply(): string {
  return `您好～${SHOP_NAME}(高雄)有不少實車實價的中古車,也可協助貸款評估,` +
    `方便的話可以看看我們官網 ${WEBSITE_URL} ,或直接電洽 ${SHOP_PHONE} 😊`;
}

/** Impure: ask Gemini to draft a reply; falls back to a template on any error. */
export async function generateLeadReply(post: ThreadsPost): Promise<string> {
  try {
    // Lazy import keeps the pure helpers (and their tests) free of the DB/env
    // module that ./_core/llm pulls in at load time.
    const { invokeLLM } = await import("./_core/llm");
    const res = await invokeLLM({
      messages: [{ role: "user", content: buildLeadDraftPrompt(post) }],
      maxTokens: 300,
    });
    const content = res.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content.trim() : "";
    return text || fallbackLeadReply();
  } catch (err: any) {
    logger.warn("ThreadsRadar", `LLM draft failed: ${err?.message || err}`);
    return fallbackLeadReply();
  }
}

// ============ OPERATOR NOTIFICATION (pure builder + impure push) ============

/** Pure: the LINE text an operator receives — original post + copy-paste draft. */
export function buildOperatorLeadMessage(post: ThreadsPost, draft: string): string {
  const who = post.username ? `@${post.username}` : "(未知帳號)";
  return [
    "🛰️ Threads 可能買車客戶",
    `👤 ${who}`,
    post.text.length > 220 ? `📝 ${post.text.slice(0, 220)}…` : `📝 ${post.text}`,
    post.url ? `🔗 ${post.url}` : "",
    "",
    "✍️ 建議回覆(複製貼上、再依情況微調):",
    draft,
    "",
    "⚠️ 請用真人在 Threads App 親自回覆,勿大量複製洗版。",
  ].filter(Boolean).join("\n");
}

/** Impure: push the lead to every configured operator over LINE. */
async function pushLeadToOperators(post: ThreadsPost, draft: string): Promise<boolean> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const operators = getOperatorUserIds();
  if (!token || operators.length === 0) {
    logger.warn("ThreadsRadar", "No LINE token or no operators configured — cannot notify");
    return false;
  }
  const text = buildOperatorLeadMessage(post, draft);
  let anySent = false;
  for (const to of operators) {
    try {
      const res = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
      });
      if (res.ok) anySent = true;
      else logger.warn("ThreadsRadar", `LINE push to operator failed: ${res.status}`);
    } catch (err: any) {
      logger.warn("ThreadsRadar", `LINE push error: ${err?.message || err}`);
    }
  }
  return anySent;
}

// ============ POLLER ============

// In-memory dedupe. v1 limitation: resets on redeploy, so the timestamp window
// (lookback) bounds any re-notification to genuinely recent posts. Phase 2:
// persist seen ids to the DB to survive restarts.
const seenPostIds = new Set<string>();
const LOOKBACK_HOURS = Number(process.env.THREADS_SEARCH_LOOKBACK_HOURS || 48);
// Bound memory growth across long uptimes.
const SEEN_CAP = 5000;

function rememberSeen(id: string): void {
  seenPostIds.add(id);
  if (seenPostIds.size > SEEN_CAP) {
    // Drop the oldest ~10% (insertion order) to keep the set bounded.
    const drop = Math.floor(SEEN_CAP * 0.1);
    for (const k of Array.from(seenPostIds).slice(0, drop)) {
      seenPostIds.delete(k);
    }
  }
}

/** Run one full sweep over all keywords. Safe to call repeatedly. */
export async function runThreadsLeadRadarOnce(nowMs = Date.now()): Promise<RadarRunSummary> {
  if (!isRadarEnabled()) {
    return { enabled: false, scanned: 0, matched: 0, notified: 0 };
  }
  let scanned = 0;
  let matched = 0;
  let notified = 0;

  for (const keyword of getSearchKeywords()) {
    const posts = await fetchThreadsPosts(keyword);
    scanned += posts.length;
    for (const post of posts) {
      if (!isBuyIntent(post.text)) continue;
      if (!shouldNotify(post, seenPostIds, nowMs, LOOKBACK_HOURS)) continue;
      matched++;
      const draft = await generateLeadReply(post);
      const ok = await pushLeadToOperators(post, draft);
      rememberSeen(post.id); // mark seen regardless so we don't retry a failed push forever
      if (ok) notified++;
    }
  }

  logger.info("ThreadsRadar", `Sweep done: scanned=${scanned} matched=${matched} notified=${notified}`);
  return { enabled: true, scanned, matched, notified };
}

/**
 * Start the recurring radar. No-op (with a single log line) when disabled, so
 * it is always safe to call at startup.
 */
export function startThreadsLeadRadarScheduler(intervalMinutes = 60): void {
  if (!isRadarEnabled()) {
    logger.info("ThreadsRadar", "Disabled (no THREADS_SEARCH_API_KEY) — radar not started");
    return;
  }
  logger.info("ThreadsRadar", `Scheduler started: sweeping every ${intervalMinutes} min`);
  // First sweep 90s after boot, then on the interval.
  setTimeout(() => { runThreadsLeadRadarOnce().catch(() => {}); }, 90_000);
  setInterval(() => { runThreadsLeadRadarOnce().catch(() => {}); }, intervalMinutes * 60 * 1000);
}
