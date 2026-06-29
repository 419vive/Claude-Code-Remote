/**
 * Threads Lead Radar — unit tests for the PURE logic.
 *
 * What this proves
 * ----------------
 * The radar's correctness-critical surfaces are all pure functions:
 *   - isBuyIntent: only fires on buyer-looking text, never on sellers
 *   - shouldNotify: dedupe + recency window
 *   - normalizeVendorItem: tolerant mapping of varied vendor field names
 *   - the prompt / fallback / operator-message builders carry the website,
 *     phone, post link and draft so a human can act
 *   - getSearchKeywords / isRadarEnabled: env handling, off by default
 *
 * No network, no LLM, no LINE — these run identically everywhere.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isBuyIntent,
  shouldNotify,
  normalizeVendorItem,
  buildLeadDraftPrompt,
  fallbackLeadReply,
  buildOperatorLeadMessage,
  getSearchKeywords,
  isRadarEnabled,
  WEBSITE_URL,
  type ThreadsPost,
} from "./threadsLeadRadar";

const post = (over: Partial<ThreadsPost> = {}): ThreadsPost => ({
  id: "p1",
  text: "想買一台中古車代步",
  url: "https://www.threads.net/@x/post/p1",
  username: "x",
  timestamp: new Date().toISOString(),
  ...over,
});

describe("isBuyIntent", () => {
  it("fires on a buyer looking for a used car", () => {
    expect(isBuyIntent("最近想買台中古車代步，預算50萬有推薦嗎")).toBe(true);
    expect(isBuyIntent("人生第一台車求推薦")).toBe(true);
    expect(isBuyIntent("通勤車找車中，有建議的嗎")).toBe(true);
  });

  it("does NOT fire on a seller / dealer post even if it says 中古車", () => {
    expect(isBuyIntent("【自售】中古車 Toyota Altis 實價刊登 誠可議")).toBe(false);
    expect(isBuyIntent("中古車急售 便宜賣 降價出售")).toBe(false);
  });

  it("does NOT fire on unrelated chatter", () => {
    expect(isBuyIntent("今天天氣真好想出去玩")).toBe(false);
    expect(isBuyIntent("這台車的冷氣壞了好煩")).toBe(false);
  });

  it("handles empty / non-string input", () => {
    expect(isBuyIntent("")).toBe(false);
    // @ts-expect-error defensive
    expect(isBuyIntent(null)).toBe(false);
    // @ts-expect-error defensive
    expect(isBuyIntent(undefined)).toBe(false);
  });
});

describe("shouldNotify — dedupe + recency", () => {
  const now = Date.parse("2026-06-29T12:00:00Z");

  it("notifies a fresh, recent, unseen post", () => {
    const seen = new Set<string>();
    expect(shouldNotify(post({ timestamp: "2026-06-29T11:00:00Z" }), seen, now, 48)).toBe(true);
  });

  it("skips a post already seen", () => {
    const seen = new Set<string>(["p1"]);
    expect(shouldNotify(post(), seen, now, 48)).toBe(false);
  });

  it("skips a post older than the lookback window", () => {
    const seen = new Set<string>();
    const old = post({ timestamp: "2026-06-25T12:00:00Z" }); // 4 days old
    expect(shouldNotify(old, seen, now, 48)).toBe(false);
  });

  it("skips a post timestamped >1h in the future (clock-skew/junk guard)", () => {
    const seen = new Set<string>();
    const future = post({ timestamp: "2026-06-29T14:00:00Z" });
    expect(shouldNotify(future, seen, now, 48)).toBe(false);
  });

  it("still notifies when the timestamp is unparseable (recency can't be judged)", () => {
    const seen = new Set<string>();
    expect(shouldNotify(post({ timestamp: "not-a-date" }), seen, now, 48)).toBe(true);
  });

  it("skips a post with no id", () => {
    const seen = new Set<string>();
    expect(shouldNotify(post({ id: "" }), seen, now, 48)).toBe(false);
  });
});

describe("normalizeVendorItem — tolerant field mapping", () => {
  it("maps standard Apify-ish fields", () => {
    const out = normalizeVendorItem({
      id: "abc", text: "想買中古車", username: "buyer1",
      url: "https://www.threads.net/@buyer1/post/abc", timestamp: "2026-06-29T10:00:00Z",
    });
    expect(out).toEqual({
      id: "abc", text: "想買中古車", username: "buyer1",
      url: "https://www.threads.net/@buyer1/post/abc", timestamp: "2026-06-29T10:00:00Z",
    });
  });

  it("maps alternate field names (caption/ownerUsername/permalink/takenAt)", () => {
    const out = normalizeVendorItem({
      pk: "xyz", caption: "找車中", ownerUsername: "buyer2",
      permalink: "https://t/xyz", takenAt: "2026-06-29T09:00:00Z",
    });
    expect(out?.id).toBe("xyz");
    expect(out?.text).toBe("找車中");
    expect(out?.username).toBe("buyer2");
    expect(out?.url).toBe("https://t/xyz");
  });

  it("synthesizes a permalink from username + id when no url is given", () => {
    const out = normalizeVendorItem({ id: "111", text: "想換車", username: "joe" });
    expect(out?.url).toBe("https://www.threads.net/@joe/post/111");
  });

  it("returns null when id or text is missing", () => {
    expect(normalizeVendorItem({ text: "no id" })).toBeNull();
    expect(normalizeVendorItem({ id: "1" })).toBeNull();
    expect(normalizeVendorItem(null)).toBeNull();
    expect(normalizeVendorItem("nope")).toBeNull();
  });
});

describe("draft + operator message builders carry the essentials", () => {
  it("prompt includes the post text and the website url", () => {
    const p = post({ text: "想買休旅車預算60萬" });
    const prompt = buildLeadDraftPrompt(p);
    expect(prompt).toContain("想買休旅車預算60萬");
    expect(prompt).toContain(WEBSITE_URL);
  });

  it("fallback reply includes the website url and the shop phone", () => {
    const reply = fallbackLeadReply();
    expect(reply).toContain(WEBSITE_URL);
    expect(reply).toContain("0936"); // SHOP_PHONE
  });

  it("operator message includes post link, username, and the draft", () => {
    const p = post({ username: "buyer9", url: "https://www.threads.net/@buyer9/post/p9" });
    const msg = buildOperatorLeadMessage(p, "您好～我們有實車實價的中古車");
    expect(msg).toContain("@buyer9");
    expect(msg).toContain("https://www.threads.net/@buyer9/post/p9");
    expect(msg).toContain("您好～我們有實車實價的中古車");
    expect(msg).toContain("真人"); // the manual-reply reminder
  });

  it("operator message truncates very long post text", () => {
    const long = "想買車".repeat(200);
    const msg = buildOperatorLeadMessage(post({ text: long }), "draft");
    expect(msg).toContain("…");
  });
});

describe("env config", () => {
  const ORIG_KEY = process.env.THREADS_SEARCH_API_KEY;
  const ORIG_KW = process.env.THREADS_SEARCH_KEYWORDS;

  beforeEach(() => {
    delete process.env.THREADS_SEARCH_API_KEY;
    delete process.env.THREADS_SEARCH_KEYWORDS;
  });
  afterEach(() => {
    if (ORIG_KEY === undefined) delete process.env.THREADS_SEARCH_API_KEY; else process.env.THREADS_SEARCH_API_KEY = ORIG_KEY;
    if (ORIG_KW === undefined) delete process.env.THREADS_SEARCH_KEYWORDS; else process.env.THREADS_SEARCH_KEYWORDS = ORIG_KW;
  });

  it("is disabled by default (no API key)", () => {
    expect(isRadarEnabled()).toBe(false);
  });

  it("is enabled once an API key is present", () => {
    process.env.THREADS_SEARCH_API_KEY = "k";
    expect(isRadarEnabled()).toBe(true);
  });

  it("falls back to default keywords when none configured", () => {
    expect(getSearchKeywords().length).toBeGreaterThan(0);
  });

  it("parses a comma-separated keyword override", () => {
    process.env.THREADS_SEARCH_KEYWORDS = "中古車, 找車 ,, 換車";
    expect(getSearchKeywords()).toEqual(["中古車", "找車", "換車"]);
  });
});
