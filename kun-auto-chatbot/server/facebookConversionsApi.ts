import crypto from "crypto";
import { logger } from "./logger";

/**
 * Facebook Conversions API (CAPI) — server-side event relay.
 *
 * Sends events to Meta's Graph API alongside the client-side Pixel,
 * enabling reliable attribution even with ad-blockers or iOS ATT.
 *
 * Required env vars:
 *   FB_PIXEL_ID        — your Pixel ID (same as VITE_FB_PIXEL_ID)
 *   FB_CAPI_TOKEN      — Conversions API access token (from Events Manager)
 *
 * Optional:
 *   FB_TEST_EVENT_CODE  — test event code for debugging (e.g. TEST12345)
 */

const PIXEL_ID = () => process.env.FB_PIXEL_ID;
const ACCESS_TOKEN = () => process.env.FB_CAPI_TOKEN;
const TEST_EVENT_CODE = () => process.env.FB_TEST_EVENT_CODE;

const GRAPH_API_VERSION = "v21.0";

// ---------- types ----------

interface UserData {
  /** Client IP (hashed automatically) */
  clientIpAddress?: string;
  /** Client User-Agent */
  clientUserAgent?: string;
  /** Facebook click ID from URL param `fbclid` */
  fbc?: string;
  /** Facebook browser ID from `_fbp` cookie */
  fbp?: string;
  /** Hashed email (SHA-256, lowercase, trimmed) */
  email?: string;
  /** Hashed phone (SHA-256, E.164 format) */
  phone?: string;
}

interface ServerEvent {
  eventName: string;
  eventTime?: number;
  eventSourceUrl?: string;
  actionSource?: "website" | "app" | "phone_call" | "chat" | "other";
  userData: UserData;
  customData?: Record<string, unknown>;
  /** Client-side event ID for deduplication with Pixel */
  eventId?: string;
}

// ---------- helpers ----------

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function hashUserData(raw: UserData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (raw.clientIpAddress) out.client_ip_address = raw.clientIpAddress;
  if (raw.clientUserAgent) out.client_user_agent = raw.clientUserAgent;
  if (raw.fbc) out.fbc = raw.fbc;
  if (raw.fbp) out.fbp = raw.fbp;
  if (raw.email) out.em = [sha256(raw.email)];
  if (raw.phone) out.ph = [sha256(raw.phone)];
  return out;
}

// ---------- public API ----------

/**
 * Send one or more events to Meta Conversions API.
 * Fails silently (logs warning) if env vars are missing.
 */
export async function sendConversionsEvent(events: ServerEvent[]): Promise<boolean> {
  const pixelId = PIXEL_ID();
  const token = ACCESS_TOKEN();

  if (!pixelId || !token) {
    logger.warn("FacebookCAPI", "FB_PIXEL_ID or FB_CAPI_TOKEN not set — skipping CAPI call");
    return false;
  }

  const payload: Record<string, unknown> = {
    data: events.map((e) => ({
      event_name: e.eventName,
      event_time: e.eventTime ?? Math.floor(Date.now() / 1000),
      event_source_url: e.eventSourceUrl,
      action_source: e.actionSource ?? "website",
      event_id: e.eventId,
      user_data: hashUserData(e.userData),
      custom_data: e.customData,
    })),
  };

  const testCode = TEST_EVENT_CODE();
  if (testCode) {
    payload.test_event_code = testCode;
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${token}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error("FacebookCAPI", `HTTP ${res.status}: ${body}`);
      return false;
    }

    logger.info("FacebookCAPI", `Sent ${events.length} event(s) — ${events.map((e) => e.eventName).join(", ")}`);
    return true;
  } catch (err) {
    logger.error("FacebookCAPI", "Network error:", err);
    return false;
  }
}

/**
 * Convenience: send a single PageView event from tracking data.
 */
export async function sendPageView(opts: {
  url: string;
  ip: string;
  userAgent: string;
  fbclid?: string;
  fbp?: string;
  eventId?: string;
}): Promise<boolean> {
  return sendConversionsEvent([
    {
      eventName: "PageView",
      eventSourceUrl: opts.url,
      eventId: opts.eventId,
      userData: {
        clientIpAddress: opts.ip,
        clientUserAgent: opts.userAgent,
        fbc: opts.fbclid ? `fb.1.${Date.now()}.${opts.fbclid}` : undefined,
        fbp: opts.fbp,
      },
    },
  ]);
}

/**
 * Convenience: send a Lead event (e.g. LINE inquiry, form submission).
 */
export async function sendLeadEvent(opts: {
  url?: string;
  ip: string;
  userAgent: string;
  fbclid?: string;
  fbp?: string;
  eventId?: string;
  phone?: string;
  email?: string;
  leadSource?: string;
}): Promise<boolean> {
  return sendConversionsEvent([
    {
      eventName: "Lead",
      eventSourceUrl: opts.url,
      eventId: opts.eventId,
      userData: {
        clientIpAddress: opts.ip,
        clientUserAgent: opts.userAgent,
        fbc: opts.fbclid ? `fb.1.${Date.now()}.${opts.fbclid}` : undefined,
        fbp: opts.fbp,
        phone: opts.phone,
        email: opts.email,
      },
      customData: opts.leadSource ? { lead_source: opts.leadSource } : undefined,
    },
  ]);
}
