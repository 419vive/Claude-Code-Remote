import { Router, Request, Response } from "express";
import { logger } from "./logger";

// ============================================================
// 8891 IMAGE PROXY
// ------------------------------------------------------------
// Problem: 8891's image CDN (p1.8891.com.tw, etc.) hotlink-protects
// against LINE's server-side image fetcher. When LINE pulls a vehicle
// photo to render a Flex card hero, 8891 returns a grey "8891 中古車"
// watermark placeholder instead of the real photo (browsers on our own
// site still get the real image, which is why the website looks fine).
//
// Fix: proxy 8891 images through our own server, replaying the same
// browser-style headers (Referer + User-Agent) the sync code already
// uses successfully against 8891's API. LINE then fetches the image
// from OUR domain and always receives the real JPEG.
//
// Security: only proxy 8891 hosts over HTTPS (SSRF guard — never let an
// attacker turn this endpoint into a generic open proxy).
// ============================================================

const ALLOWED_HOST_RE = /(^|\.)8891\.com\.tw$/i;

/**
 * True only for HTTPS URLs whose host is (a subdomain of) 8891.com.tw.
 * Everything else (other hosts, http://, junk) is rejected so the proxy
 * can never be abused to fetch arbitrary/internal URLs.
 */
export function isProxiableImageUrl(raw: string): boolean {
  if (!raw || typeof raw !== "string") return false;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && ALLOWED_HOST_RE.test(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Wrap a stored photo URL so LINE fetches it through our proxy. 8891 URLs
 * are rewritten to `${BASE_URL}/img/8891?u=<encoded>`; any other URL
 * (placeholder.com fallbacks, already-rehosted images) is returned as-is.
 */
export function toProxiedPhotoUrl(rawUrl: string): string {
  if (!isProxiableImageUrl(rawUrl)) return rawUrl;
  const base = process.env.BASE_URL || "https://claude-code-remote-production.up.railway.app";
  return `${base}/img/8891?u=${encodeURIComponent(rawUrl)}`;
}

export const imageProxyRouter = Router();

imageProxyRouter.get("/img/8891", async (req: Request, res: Response) => {
  const raw = typeof req.query.u === "string" ? req.query.u : "";

  if (!isProxiableImageUrl(raw)) {
    res.status(400).type("text/plain").send("invalid image url");
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const upstream = await fetch(raw, {
      signal: controller.signal,
      headers: {
        // Same headers the 8891 sync uses — this is what makes 8891 serve
        // the real photo instead of the anti-hotlink watermark.
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "zh-TW,zh;q=0.9",
        "Referer": "https://www.8891.com.tw/",
      },
    });

    const contentType = upstream.headers.get("content-type") || "";

    // If 8891 didn't give us a real image, fall back to redirecting to the
    // original URL — no worse than today for LINE, and still works in browsers.
    if (!upstream.ok || !contentType.startsWith("image/")) {
      clearTimeout(timeout);
      logger.warn("ImageProxy", `Upstream not an image (${upstream.status} ${contentType}), redirecting: ${raw.slice(0, 120)}`);
      res.redirect(302, raw);
      return;
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    clearTimeout(timeout);

    res.setHeader("Content-Type", contentType);
    // Vehicle photos are immutable per-URL → cache hard (browser + LINE CDN).
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800, immutable");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.send(buf);
  } catch (err: any) {
    clearTimeout(timeout);
    logger.warn("ImageProxy", `Fetch failed for ${raw.slice(0, 120)}: ${err?.message || err}`);
    // Best-effort fallback so non-LINE contexts still resolve something.
    res.redirect(302, raw);
  }
});
