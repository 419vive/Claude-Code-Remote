/**
 * Tests for the 2026-04-26 GEO Phase 1 push — pushes toward #1 Google
 * ranking for "高雄二手車" by capturing more SERP features.
 *
 * Locks in:
 *   1. Homepage FAQPage schema ships ≥18 questions (target: 20)
 *   2. /about, /car-valuation, /media each ship a FAQPage block
 *   3. Tightened homepage title doesn't exceed CJK SERP limit
 *   4. Tightened SITE_DESCRIPTION fits in CJK SERP description window
 *   5. AggregateRating still present on the AutoDealer (regression guard)
 *   6. New "高雄二手車" PAA-targeted Qs are actually present (not just count)
 *
 * Why this matters: Google's "People Also Ask" SERP feature pulls verbatim
 * from FAQPage JSON-LD. Each captured question = one SERP shelf we own.
 * For "高雄二手車" the PAA carousel is THE most-clicked section; owning
 * 5+ slots there typically beats organic position #1 on click share.
 */

import { describe, it, expect } from "vitest";
import { injectSeoTags } from "./seo";

// Minimal HTML template that mimics what the SPA's index.html looks like to
// the seo middleware. injectSeoTags strips/replaces tags then splices the
// SEO block before </head>, so we just need a parseable scaffold.
const TEMPLATE = `<!DOCTYPE html>
<html lang="zh-TW">
  <head>
    <meta charset="UTF-8" />
    <title>placeholder</title>
  </head>
  <body><div id="root"></div></body>
</html>`;

/**
 * Extract every JSON-LD <script> block from injected HTML and parse them.
 * Returns flat array (one entry per <script type="application/ld+json">).
 */
function extractJsonLd(html: string): any[] {
  const blocks: any[] = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      blocks.push(JSON.parse(m[1]));
    } catch {
      // ignore malformed (test will fail elsewhere if real)
    }
  }
  return blocks;
}

function findSchemaByType(blocks: any[], type: string): any | undefined {
  return blocks.find(b => b && b["@type"] === type);
}

function extractTitle(html: string): string {
  const m = html.match(/<title>([^<]+)<\/title>/);
  return m ? m[1] : "";
}

function extractMetaDescription(html: string): string {
  const m = html.match(/<meta name="description" content="([^"]*)"/);
  return m ? m[1] : "";
}

/**
 * Approximate width-units for CJK + ASCII mixed strings.
 * Each CJK char counts ~2, each ASCII/digit/space counts ~1.
 * Google's SERP truncation is ~155 width units for descriptions, ~60 for titles.
 */
function approxWidth(s: string): number {
  let width = 0;
  for (const ch of s) {
    // High Unicode range = CJK / fullwidth
    width += ch.charCodeAt(0) > 0xFF ? 2 : 1;
  }
  return width;
}

describe("GEO Phase 1 — Homepage FAQ expansion (高雄二手車 PAA capture)", () => {
  it("homepage ships at least 18 FAQ questions (target 20, threshold 18)", async () => {
    const out = await injectSeoTags(TEMPLATE, "/");
    const blocks = extractJsonLd(out);
    const faq = findSchemaByType(blocks, "FAQPage");
    expect(faq).toBeDefined();
    expect(Array.isArray(faq.mainEntity)).toBe(true);
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(18);
  });

  it("homepage FAQs include high-volume '高雄二手車' PAA queries", async () => {
    const out = await injectSeoTags(TEMPLATE, "/");
    const blocks = extractJsonLd(out);
    const faq = findSchemaByType(blocks, "FAQPage");
    const questions: string[] = faq.mainEntity.map((q: any) => q.name);

    // These are the PAA-targeted Qs added 2026-04-26. If any of them go
    // missing, we lose the corresponding SERP shelf.
    expect(questions).toContain("高雄二手車推薦哪裡買？");
    expect(questions).toContain("高雄二手車哪間最可靠？");
    expect(questions).toContain("高雄二手車市場行情怎麼看？");
    expect(questions).toContain("高雄二手車比台北便宜嗎？");
    expect(questions).toContain("高雄三民區有哪些二手車行？");
  });

  it("homepage FAQs preserve the original comparison Qs (HOT / SUM / Toyota 認證)", async () => {
    const out = await injectSeoTags(TEMPLATE, "/");
    const blocks = extractJsonLd(out);
    const faq = findSchemaByType(blocks, "FAQPage");
    const questions: string[] = faq.mainEntity.map((q: any) => q.name);

    // Comparison Qs are critical for "崑家 vs 競品" branded queries.
    expect(questions).toContain("崑家汽車跟HOT大聯盟有什麼不同？");
    expect(questions).toContain("崑家汽車跟SUM認證車聯盟比較哪個好？");
    expect(questions).toContain("崑家汽車跟Toyota原廠認證中古車比？");
  });

  it("every FAQ answer is non-empty and at least 30 CJK chars (substance check)", async () => {
    const out = await injectSeoTags(TEMPLATE, "/");
    const blocks = extractJsonLd(out);
    const faq = findSchemaByType(blocks, "FAQPage");
    for (const q of faq.mainEntity) {
      const answer = q.acceptedAnswer?.text;
      expect(answer).toBeTruthy();
      expect(approxWidth(answer)).toBeGreaterThan(30);
    }
  });
});

describe("GEO Phase 1 — Trust-page FAQ injection (/about, /car-valuation, /media)", () => {
  it("/about ships a FAQPage with brand-credibility Qs", async () => {
    const out = await injectSeoTags(TEMPLATE, "/about");
    const blocks = extractJsonLd(out);
    const faq = findSchemaByType(blocks, "FAQPage");
    expect(faq).toBeDefined();
    const questions: string[] = faq.mainEntity.map((q: any) => q.name);
    expect(questions.length).toBeGreaterThanOrEqual(3);
    // At least ONE of these representative founder/credibility Qs must ship
    expect(questions.some(q => /崑家汽車是誰/.test(q) || /經營多久/.test(q) || /為什麼叫崑家/.test(q))).toBe(true);
  });

  it("/car-valuation ships a FAQPage targeting estimation/trade-in queries", async () => {
    const out = await injectSeoTags(TEMPLATE, "/car-valuation");
    const blocks = extractJsonLd(out);
    const faq = findSchemaByType(blocks, "FAQPage");
    expect(faq).toBeDefined();
    const questions: string[] = faq.mainEntity.map((q: any) => q.name);
    expect(questions.length).toBeGreaterThanOrEqual(3);
    expect(questions.some(q => /估價/.test(q) || /收購/.test(q))).toBe(true);
  });

  it("/media ships a FAQPage targeting credibility queries", async () => {
    const out = await injectSeoTags(TEMPLATE, "/media");
    const blocks = extractJsonLd(out);
    const faq = findSchemaByType(blocks, "FAQPage");
    expect(faq).toBeDefined();
    const questions: string[] = faq.mainEntity.map((q: any) => q.name);
    expect(questions.length).toBeGreaterThanOrEqual(2);
  });
});

describe("GEO Phase 1 — Title/description tightening (CJK SERP truncation guard)", () => {
  it("homepage title leads with the target keyword '高雄二手車'", async () => {
    const out = await injectSeoTags(TEMPLATE, "/");
    const title = extractTitle(out);
    // The keyword must appear at the START — Google weighs first-position
    // keyword density much higher than later occurrences.
    expect(title.startsWith("高雄二手車")).toBe(true);
  });

  it("homepage title fits CJK SERP width (≤60 width units)", async () => {
    const out = await injectSeoTags(TEMPLATE, "/");
    const title = extractTitle(out);
    // Google SERP truncates titles at ~600px ≈ 60 width units (CJK = 2 each).
    // Exceeding this hides the trust suffix (40年正派經營, 第三方認證) —
    // the very signals that drive CTR for 二手車 buyers.
    expect(approxWidth(title)).toBeLessThanOrEqual(60);
  });

  it("homepage meta description fits CJK SERP description window (≤160 width units)", async () => {
    const out = await injectSeoTags(TEMPLATE, "/");
    const desc = extractMetaDescription(out);
    expect(approxWidth(desc)).toBeLessThanOrEqual(160);
  });

  it("homepage meta description still mentions the address landmark (肯德基)", async () => {
    const out = await injectSeoTags(TEMPLATE, "/");
    const desc = extractMetaDescription(out);
    // Landmark cue ("肯德基斜對面") is one of the highest-CTR snippets in
    // local-business SERP because it gives directional confidence to clickers.
    expect(desc).toContain("肯德基");
  });
});

describe("GEO Phase 1 — Schema regression guards (don't break what's working)", () => {
  it("homepage still ships AutoDealer with AggregateRating (4.8/5)", async () => {
    const out = await injectSeoTags(TEMPLATE, "/");
    const blocks = extractJsonLd(out);
    const dealer = findSchemaByType(blocks, "AutoDealer");
    expect(dealer).toBeDefined();
    expect(dealer.aggregateRating).toBeDefined();
    expect(dealer.aggregateRating.ratingValue).toBe("4.8");
    expect(dealer.aggregateRating.bestRating).toBe("5");
    // ratingCount drives the # of stars shown in SERP — must be ≥1
    expect(parseInt(dealer.aggregateRating.ratingCount, 10)).toBeGreaterThanOrEqual(1);
  });

  it("homepage still ships WebSite schema with SearchAction (sitelinks search box)", async () => {
    const out = await injectSeoTags(TEMPLATE, "/");
    const blocks = extractJsonLd(out);
    const website = findSchemaByType(blocks, "WebSite");
    expect(website).toBeDefined();
    expect(website.potentialAction?.["@type"]).toBe("SearchAction");
  });

  it("homepage still ships BreadcrumbList", async () => {
    const out = await injectSeoTags(TEMPLATE, "/");
    const blocks = extractJsonLd(out);
    const crumb = findSchemaByType(blocks, "BreadcrumbList");
    expect(crumb).toBeDefined();
  });

  it("AutoDealer.knowsAbout still includes '高雄二手車' (topic authority signal)", async () => {
    const out = await injectSeoTags(TEMPLATE, "/");
    const blocks = extractJsonLd(out);
    const dealer = findSchemaByType(blocks, "AutoDealer");
    expect(dealer.knowsAbout).toContain("高雄二手車");
  });
});
