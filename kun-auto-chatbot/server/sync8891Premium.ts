/**
 * 8891 精選廣告 (SuperTop) Scraper
 *
 * Uses Playwright to log into 8891 member area and scrape
 * premium ad performance data from the SuperTop dashboard.
 *
 * Credentials are read from environment variables:
 *   EIGHTBALL_ACCOUNT — 8891 login account
 *   EIGHTBALL_PASSWORD — 8891 login password
 */

import { eq, and, sql } from "drizzle-orm";
import { premiumAds8891 } from "../drizzle/schema";
import { getDb } from "./db";
import { logger } from "./logger";

export interface PremiumAdData {
  itemId: string;
  carName: string | null;
  price: string | null;
  status: string | null;
  campaignPeriod: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  currentRank: number | null;
  currentBid: number | null;
  cumulativeDays: number;
  avgRank: number | null;
  avgBid: number | null;
  totalCost: number;
  impressions: number;
  clicks: number;
  autoRenew: number;
  fetchedAt: Date;
}

const LOGIN_URL = "https://www.8891.com.tw/member-login.html";
const PROCESSING_URL = "https://www.8891.com.tw/superTop-dashboard.html?tab=processing";
const COMPLETED_URL = "https://www.8891.com.tw/superTop-dashboard.html?tab=completed";

/**
 * Scrape the "推廣中" (processing) tab for active campaigns.
 */
function parseProcessingPage(bodyText: string): Partial<PremiumAdData>[] {
  const results: Partial<PremiumAdData>[] = [];

  // Extract item IDs
  const itemIdMatches = bodyText.match(/物件編號：(S\d+)/g) || [];
  const itemIds = itemIdMatches.map(m => {
    const match = m.match(/物件編號：(S\d+)/);
    return match ? match[1] : "";
  }).filter(Boolean);

  // Extract campaign period info
  const periodMatch = bodyText.match(/第([\d\-]+期)推廣時間：([\d\-\s:]+)至([\d\-\s:]+)/);
  const campaignPeriod = periodMatch ? `第${periodMatch[1]}` : null;
  const periodStart = periodMatch ? periodMatch[2].trim() : null;
  const periodEnd = periodMatch ? periodMatch[3].trim() : null;

  // Extract current rank
  const rankMatch = bodyText.match(/本期排名\s*第(\d+)名/);
  const currentRank = rankMatch ? parseInt(rankMatch[1]) : null;

  // Extract current bid
  const bidMatch = bodyText.match(/本期出價\s*(\d+)元/);
  const currentBid = bidMatch ? parseInt(bidMatch[1]) : null;

  // Check auto-renew
  const autoRenew = /自動續訂/.test(bodyText) ? 1 : 0;

  // For each item found, create a record with the shared campaign data
  for (const itemId of itemIds) {
    // Try to extract car name near the item ID
    // Look for brand/model patterns (e.g., Mazda CX-5, Toyota RAV4)
    const namePattern = new RegExp(`([A-Za-z\\u4e00-\\u9fff]+\\s*[A-Za-z0-9\\-]+)\\s*.*?${itemId.replace('S', 'S?')}`);
    const nameMatch = bodyText.match(namePattern);

    results.push({
      itemId,
      carName: nameMatch ? nameMatch[1].trim() : null,
      status: "推廣中",
      campaignPeriod,
      periodStart,
      periodEnd,
      currentRank,
      currentBid,
      autoRenew,
    });
  }

  return results;
}

/**
 * Scrape the "成效明細" (completed) tab for cumulative stats.
 */
function parseCompletedPage(bodyText: string): Map<string, Partial<PremiumAdData>> {
  const statsMap = new Map<string, Partial<PremiumAdData>>();

  // Extract item IDs from this page too
  const itemIdMatches = bodyText.match(/物件編號：(S\d+)/g) || [];
  const itemIds = itemIdMatches.map(m => {
    const match = m.match(/物件編號：(S\d+)/);
    return match ? match[1] : "";
  }).filter(Boolean);

  // Status
  const statusMatch = bodyText.match(/推廣狀態\s*(推廣中|已結束)/);
  const status = statusMatch ? statusMatch[1] : null;

  // Cumulative days
  const daysMatch = bodyText.match(/累計推廣天數(\d+)天/);
  const cumulativeDays = daysMatch ? parseInt(daysMatch[1]) : 0;

  // Average rank
  const avgRankMatch = bodyText.match(/平均排名第(\d+)名/);
  const avgRank = avgRankMatch ? parseInt(avgRankMatch[1]) : null;

  // Average bid
  const avgBidMatch = bodyText.match(/平均出價(\d+)元/);
  const avgBid = avgBidMatch ? parseInt(avgBidMatch[1]) : null;

  // Total cost
  const costMatch = bodyText.match(/累計費用(\d+)元/);
  const totalCost = costMatch ? parseInt(costMatch[1]) : 0;

  // Impressions
  const impressionsMatch = bodyText.match(/累計曝光量(\d+)/);
  const impressions = impressionsMatch ? parseInt(impressionsMatch[1]) : 0;

  // Clicks
  const clicksMatch = bodyText.match(/累計點閱量(\d+)/);
  const clicks = clicksMatch ? parseInt(clicksMatch[1]) : 0;

  for (const itemId of itemIds) {
    statsMap.set(itemId, {
      status: status || undefined,
      cumulativeDays,
      avgRank,
      avgBid,
      totalCost,
      impressions,
      clicks,
    });
  }

  return statsMap;
}

/**
 * Main sync function — launches Playwright, logs in, scrapes both tabs,
 * and upserts results into the database.
 */
export async function sync8891Premium(): Promise<void> {
  const account = process.env.EIGHTBALL_ACCOUNT;
  const password = process.env.EIGHTBALL_PASSWORD;

  if (!account || !password) {
    logger.warn("8891 Premium", "EIGHTBALL_ACCOUNT or EIGHTBALL_PASSWORD not set, skipping sync");
    return;
  }

  let browser: any = null;

  try {
    // Dynamic import so the server doesn't crash if playwright isn't installed
    const { chromium } = await import("playwright");

    logger.info("8891 Premium", "Launching browser for premium ad sync...");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    // Step 1: Login
    logger.info("8891 Premium", "Logging in to 8891...");
    await page.goto(LOGIN_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.fill('input[name="account"]', account);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"], input[type="submit"], .login-btn, .btn-login');
    await page.waitForNavigation({ waitUntil: "networkidle", timeout: 30000 }).catch(() => {
      // Some login flows don't trigger navigation
    });
    // Wait a moment for login to complete
    await page.waitForTimeout(2000);

    // Step 2: Scrape "推廣中" tab
    logger.info("8891 Premium", "Scraping processing tab...");
    await page.goto(PROCESSING_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    const processingText = await page.evaluate(() => document.body.innerText);
    const processingData = parseProcessingPage(processingText);

    // Step 3: Scrape "成效明細" tab
    logger.info("8891 Premium", "Scraping completed/stats tab...");
    await page.goto(COMPLETED_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    const completedText = await page.evaluate(() => document.body.innerText);
    const completedStats = parseCompletedPage(completedText);

    await browser.close();
    browser = null;

    // Step 4: Merge data and upsert
    const mergedRecords: PremiumAdData[] = processingData.map(p => {
      const stats = completedStats.get(p.itemId!) || {};
      return {
        itemId: p.itemId!,
        carName: p.carName || null,
        price: p.price || null,
        status: stats.status || p.status || null,
        campaignPeriod: p.campaignPeriod || null,
        periodStart: p.periodStart || null,
        periodEnd: p.periodEnd || null,
        currentRank: p.currentRank ?? null,
        currentBid: p.currentBid ?? null,
        cumulativeDays: stats.cumulativeDays || 0,
        avgRank: stats.avgRank ?? null,
        avgBid: stats.avgBid ?? null,
        totalCost: stats.totalCost || 0,
        impressions: stats.impressions || 0,
        clicks: stats.clicks || 0,
        autoRenew: p.autoRenew || 0,
        fetchedAt: new Date(),
      };
    });

    // Also include items only found in completed tab
    for (const [itemId, stats] of completedStats) {
      if (!mergedRecords.some(r => r.itemId === itemId)) {
        mergedRecords.push({
          itemId,
          carName: null,
          price: null,
          status: stats.status || "已結束",
          campaignPeriod: null,
          periodStart: null,
          periodEnd: null,
          currentRank: null,
          currentBid: null,
          cumulativeDays: stats.cumulativeDays || 0,
          avgRank: stats.avgRank ?? null,
          avgBid: stats.avgBid ?? null,
          totalCost: stats.totalCost || 0,
          impressions: stats.impressions || 0,
          clicks: stats.clicks || 0,
          autoRenew: 0,
          fetchedAt: new Date(),
        });
      }
    }

    // Step 5: Upsert into database
    const db = await getDb();
    if (!db) {
      logger.warn("8891 Premium", "Database not available, skipping upsert");
      return;
    }

    for (const record of mergedRecords) {
      try {
        // Check if record exists for this itemId (most recent)
        const existing = await db
          .select()
          .from(premiumAds8891)
          .where(eq(premiumAds8891.itemId, record.itemId))
          .orderBy(sql`${premiumAds8891.fetchedAt} DESC`)
          .limit(1);

        if (existing.length > 0) {
          // Update existing record
          await db
            .update(premiumAds8891)
            .set({
              carName: record.carName,
              price: record.price,
              status: record.status,
              campaignPeriod: record.campaignPeriod,
              periodStart: record.periodStart,
              periodEnd: record.periodEnd,
              currentRank: record.currentRank,
              currentBid: record.currentBid,
              cumulativeDays: record.cumulativeDays,
              avgRank: record.avgRank,
              avgBid: record.avgBid,
              totalCost: record.totalCost,
              impressions: record.impressions,
              clicks: record.clicks,
              autoRenew: record.autoRenew,
            })
            .where(eq(premiumAds8891.id, existing[0].id));
        } else {
          // Insert new record
          await db.insert(premiumAds8891).values({
            itemId: record.itemId,
            carName: record.carName,
            price: record.price,
            status: record.status,
            campaignPeriod: record.campaignPeriod,
            periodStart: record.periodStart,
            periodEnd: record.periodEnd,
            currentRank: record.currentRank,
            currentBid: record.currentBid,
            cumulativeDays: record.cumulativeDays,
            avgRank: record.avgRank,
            avgBid: record.avgBid,
            totalCost: record.totalCost,
            impressions: record.impressions,
            clicks: record.clicks,
            autoRenew: record.autoRenew,
          });
        }
      } catch (err) {
        logger.error("8891 Premium", `Failed to upsert item ${record.itemId}:`, err);
      }
    }

    logger.info("8891 Premium", `Sync complete: ${mergedRecords.length} records processed`);
  } catch (err) {
    logger.error("8891 Premium", "Sync failed:", err);
  } finally {
    if (browser) {
      try { await browser.close(); } catch (_) { /* ignore */ }
    }
  }
}

/**
 * Get all premium ad stats from the database (latest per itemId).
 */
export async function getPremiumAdStats(): Promise<PremiumAdData[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const rows = await db
      .select()
      .from(premiumAds8891)
      .orderBy(sql`${premiumAds8891.fetchedAt} DESC`);

    // Deduplicate: keep only the latest record per itemId
    const seen = new Set<string>();
    const unique: PremiumAdData[] = [];
    for (const row of rows) {
      if (!seen.has(row.itemId)) {
        seen.add(row.itemId);
        unique.push({
          itemId: row.itemId,
          carName: row.carName,
          price: row.price,
          status: row.status,
          campaignPeriod: row.campaignPeriod,
          periodStart: row.periodStart,
          periodEnd: row.periodEnd,
          currentRank: row.currentRank,
          currentBid: row.currentBid,
          cumulativeDays: row.cumulativeDays ?? 0,
          avgRank: row.avgRank,
          avgBid: row.avgBid,
          totalCost: row.totalCost ?? 0,
          impressions: row.impressions ?? 0,
          clicks: row.clicks ?? 0,
          autoRenew: row.autoRenew ?? 0,
          fetchedAt: row.fetchedAt,
        });
      }
    }

    return unique;
  } catch (err) {
    logger.error("8891 Premium", "Failed to fetch stats:", err);
    return [];
  }
}
