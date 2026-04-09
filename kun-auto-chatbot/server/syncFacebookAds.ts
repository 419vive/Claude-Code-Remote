/**
 * Facebook / Instagram Ads Sync Service
 *
 * Uses the Meta Marketing API to fetch campaign performance data.
 *
 * Credentials from environment variables:
 *   FB_AD_ACCOUNT_ID  — Ad account ID (format: act_XXXXXXXXX)
 *   FB_ACCESS_TOKEN   — Long-lived access token with ads_read permission
 */

import { eq, sql } from "drizzle-orm";
import { facebookAdsCampaigns } from "../drizzle/schema";
import { getDb } from "./db";
import { logger } from "./logger";
import axios from "axios";

const API_BASE = "https://graph.facebook.com/v21.0";

export interface FacebookAdData {
  campaignId: string;
  campaignName: string | null;
  adAccountId: string;
  status: string | null;
  objective: string | null;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  conversions: number;
  costPerConversion: number | null;
  dateStart: string | null;
  dateEnd: string | null;
  fetchedAt: Date;
}

export interface FacebookAdSummary {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalReach: number;
  totalConversions: number;
  avgCTR: number;
  avgCPC: number;
  activeCampaigns: number;
}

interface CampaignRaw {
  id: string;
  name?: string;
  status?: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

interface InsightRaw {
  spend?: string;
  impressions?: string;
  clicks?: string;
  reach?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  actions?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
  date_start?: string;
  date_stop?: string;
}

/**
 * Fetch all campaigns from the ad account.
 */
async function fetchCampaigns(accountId: string, token: string): Promise<CampaignRaw[]> {
  const campaigns: CampaignRaw[] = [];
  let url = `${API_BASE}/${accountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget&limit=100&access_token=${token}`;

  while (url) {
    const res = await axios.get(url, { timeout: 15000 });
    if (res.data?.data) {
      campaigns.push(...res.data.data);
    }
    url = res.data?.paging?.next || "";
  }

  return campaigns;
}

/**
 * Fetch insights (last 30 days) for a single campaign.
 */
async function fetchCampaignInsights(campaignId: string, token: string): Promise<InsightRaw | null> {
  try {
    const url = `${API_BASE}/${campaignId}/insights?fields=spend,impressions,clicks,reach,ctr,cpc,cpm,actions,cost_per_action_type&date_preset=last_30d&access_token=${token}`;
    const res = await axios.get(url, { timeout: 15000 });
    return res.data?.data?.[0] || null;
  } catch (err: any) {
    // 429 = rate limit, log and skip
    if (err?.response?.status === 429) {
      logger.warn("Facebook Ads", `Rate limited fetching insights for campaign ${campaignId}`);
    } else {
      logger.error("Facebook Ads", `Failed to fetch insights for ${campaignId}:`, err?.message);
    }
    return null;
  }
}

/**
 * Extract conversion count from the actions array.
 * Looks for Lead and Schedule pixel events.
 */
function extractConversions(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions) return 0;
  let total = 0;
  for (const a of actions) {
    if (
      a.action_type === "offsite_conversion.fb_pixel_lead" ||
      a.action_type === "offsite_conversion.fb_pixel_schedule" ||
      a.action_type === "lead" ||
      a.action_type === "onsite_conversion.lead_grouped"
    ) {
      total += parseInt(a.value) || 0;
    }
  }
  return total;
}

/**
 * Extract cost per conversion from cost_per_action_type.
 */
function extractCostPerConversion(costActions?: Array<{ action_type: string; value: string }>): number | null {
  if (!costActions) return null;
  for (const a of costActions) {
    if (
      a.action_type === "offsite_conversion.fb_pixel_lead" ||
      a.action_type === "lead" ||
      a.action_type === "onsite_conversion.lead_grouped"
    ) {
      return parseFloat(a.value) || null;
    }
  }
  return null;
}

/**
 * Main sync function — fetches all campaigns + insights and upserts into DB.
 */
export async function syncFacebookAds(): Promise<void> {
  const accountId = process.env.FB_AD_ACCOUNT_ID;
  const token = process.env.FB_ACCESS_TOKEN;

  if (!accountId || !token) {
    logger.warn("Facebook Ads", "FB_AD_ACCOUNT_ID or FB_ACCESS_TOKEN not set, skipping sync");
    return;
  }

  try {
    logger.info("Facebook Ads", "Starting sync...");

    // Step 1: Fetch all campaigns
    const campaigns = await fetchCampaigns(accountId, token);
    logger.info("Facebook Ads", `Found ${campaigns.length} campaigns`);

    const db = await getDb();
    if (!db) {
      logger.warn("Facebook Ads", "Database not available, skipping upsert");
      return;
    }

    // Step 2: For each campaign, fetch insights and upsert
    for (const campaign of campaigns) {
      try {
        const insights = await fetchCampaignInsights(campaign.id, token);

        const record = {
          campaignId: campaign.id,
          campaignName: campaign.name || null,
          adAccountId: accountId,
          status: campaign.status || null,
          objective: campaign.objective || null,
          dailyBudget: campaign.daily_budget ? parseInt(campaign.daily_budget) : null,
          lifetimeBudget: campaign.lifetime_budget ? parseInt(campaign.lifetime_budget) : null,
          spend: insights?.spend ? parseFloat(insights.spend) : 0,
          impressions: insights?.impressions ? parseInt(insights.impressions) : 0,
          clicks: insights?.clicks ? parseInt(insights.clicks) : 0,
          reach: insights?.reach ? parseInt(insights.reach) : 0,
          ctr: insights?.ctr ? parseFloat(insights.ctr) : null,
          cpc: insights?.cpc ? parseFloat(insights.cpc) : null,
          cpm: insights?.cpm ? parseFloat(insights.cpm) : null,
          conversions: extractConversions(insights?.actions),
          costPerConversion: extractCostPerConversion(insights?.cost_per_action_type),
          dateStart: insights?.date_start || null,
          dateEnd: insights?.date_stop || null,
        };

        // Upsert: check if campaign already exists
        const existing = await db
          .select()
          .from(facebookAdsCampaigns)
          .where(eq(facebookAdsCampaigns.campaignId, campaign.id))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(facebookAdsCampaigns)
            .set({
              campaignName: record.campaignName,
              status: record.status,
              objective: record.objective,
              dailyBudget: record.dailyBudget,
              lifetimeBudget: record.lifetimeBudget,
              spend: String(record.spend),
              impressions: record.impressions,
              clicks: record.clicks,
              reach: record.reach,
              ctr: record.ctr !== null ? String(record.ctr) : null,
              cpc: record.cpc !== null ? String(record.cpc) : null,
              cpm: record.cpm !== null ? String(record.cpm) : null,
              conversions: record.conversions,
              costPerConversion: record.costPerConversion !== null ? String(record.costPerConversion) : null,
              dateStart: record.dateStart,
              dateEnd: record.dateEnd,
            })
            .where(eq(facebookAdsCampaigns.id, existing[0].id));
        } else {
          await db.insert(facebookAdsCampaigns).values({
            campaignId: record.campaignId,
            campaignName: record.campaignName,
            adAccountId: record.adAccountId,
            status: record.status,
            objective: record.objective,
            dailyBudget: record.dailyBudget,
            lifetimeBudget: record.lifetimeBudget,
            spend: String(record.spend),
            impressions: record.impressions,
            clicks: record.clicks,
            reach: record.reach,
            ctr: record.ctr !== null ? String(record.ctr) : null,
            cpc: record.cpc !== null ? String(record.cpc) : null,
            cpm: record.cpm !== null ? String(record.cpm) : null,
            conversions: record.conversions,
            costPerConversion: record.costPerConversion !== null ? String(record.costPerConversion) : null,
            dateStart: record.dateStart,
            dateEnd: record.dateEnd,
          });
        }

        // Small delay to respect rate limits
        await new Promise(r => setTimeout(r, 200));
      } catch (err: any) {
        logger.error("Facebook Ads", `Failed to process campaign ${campaign.id}:`, err?.message);
      }
    }

    logger.info("Facebook Ads", `Sync complete: ${campaigns.length} campaigns processed`);
  } catch (err: any) {
    logger.error("Facebook Ads", "Sync failed:", err?.message);
  }
}

/**
 * Get all Facebook ad campaign data from the database.
 */
export async function getFacebookAdStats(): Promise<FacebookAdData[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const rows = await db
      .select()
      .from(facebookAdsCampaigns)
      .orderBy(sql`${facebookAdsCampaigns.spend} DESC`);

    return rows.map(row => ({
      campaignId: row.campaignId,
      campaignName: row.campaignName,
      adAccountId: row.adAccountId,
      status: row.status,
      objective: row.objective,
      dailyBudget: row.dailyBudget,
      lifetimeBudget: row.lifetimeBudget,
      spend: Number(row.spend) || 0,
      impressions: row.impressions ?? 0,
      clicks: row.clicks ?? 0,
      reach: row.reach ?? 0,
      ctr: row.ctr ? Number(row.ctr) : null,
      cpc: row.cpc ? Number(row.cpc) : null,
      cpm: row.cpm ? Number(row.cpm) : null,
      conversions: row.conversions ?? 0,
      costPerConversion: row.costPerConversion ? Number(row.costPerConversion) : null,
      dateStart: row.dateStart,
      dateEnd: row.dateEnd,
      fetchedAt: row.fetchedAt,
    }));
  } catch (err) {
    logger.error("Facebook Ads", "Failed to fetch stats:", err);
    return [];
  }
}

/**
 * Get aggregated summary of all Facebook ad campaigns.
 */
export async function getFacebookAdSummary(): Promise<FacebookAdSummary> {
  const stats = await getFacebookAdStats();

  const totalSpend = stats.reduce((s, r) => s + r.spend, 0);
  const totalImpressions = stats.reduce((s, r) => s + r.impressions, 0);
  const totalClicks = stats.reduce((s, r) => s + r.clicks, 0);
  const totalReach = stats.reduce((s, r) => s + r.reach, 0);
  const totalConversions = stats.reduce((s, r) => s + r.conversions, 0);
  const activeCampaigns = stats.filter(r => r.status === "ACTIVE").length;
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;

  return {
    totalSpend,
    totalImpressions,
    totalClicks,
    totalReach,
    totalConversions,
    avgCTR: Math.round(avgCTR * 100) / 100,
    avgCPC: Math.round(avgCPC * 100) / 100,
    activeCampaigns,
  };
}
