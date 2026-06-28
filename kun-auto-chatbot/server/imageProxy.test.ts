/**
 * 8891 Image Proxy — unit tests for the pure URL guards.
 *
 * What this proves
 * ----------------
 * The proxy's only security-critical surface is `isProxiableImageUrl`: it must
 * accept ONLY https 8891 hosts and reject everything else (other hosts, http,
 * internal addresses, junk) so the endpoint can never become an open SSRF
 * proxy. `toProxiedPhotoUrl` then wraps exactly those URLs and passes anything
 * else through untouched, so non-8891 fallback images (placeholder.com) and
 * already-rehosted images are never rewritten.
 *
 * These are pure functions — no network — so they run identically everywhere.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isProxiableImageUrl, toProxiedPhotoUrl } from "./imageProxy";

describe("isProxiableImageUrl — SSRF whitelist", () => {
  it("accepts an https 8891 CDN image url", () => {
    expect(isProxiableImageUrl("https://p1.8891.com.tw/abc/photo.jpg")).toBe(true);
  });

  it("accepts the apex 8891 domain over https", () => {
    expect(isProxiableImageUrl("https://8891.com.tw/x.jpg")).toBe(true);
  });

  it("accepts any 8891 subdomain over https", () => {
    expect(isProxiableImageUrl("https://images.cdn.8891.com.tw/y.webp")).toBe(true);
  });

  it("rejects http (non-TLS) 8891 urls", () => {
    expect(isProxiableImageUrl("http://p1.8891.com.tw/photo.jpg")).toBe(false);
  });

  it("rejects look-alike hosts that merely contain the string 8891", () => {
    expect(isProxiableImageUrl("https://8891.com.tw.evil.com/x.jpg")).toBe(false);
    expect(isProxiableImageUrl("https://evil8891.com.tw.attacker.net/x.jpg")).toBe(false);
    expect(isProxiableImageUrl("https://my8891.com/x.jpg")).toBe(false);
  });

  it("rejects arbitrary third-party hosts", () => {
    expect(isProxiableImageUrl("https://example.com/x.jpg")).toBe(false);
    expect(isProxiableImageUrl("https://via.placeholder.com/800x600")).toBe(false);
  });

  it("rejects internal / SSRF target addresses", () => {
    expect(isProxiableImageUrl("http://169.254.169.254/latest/meta-data/")).toBe(false);
    expect(isProxiableImageUrl("http://localhost:6379/")).toBe(false);
    expect(isProxiableImageUrl("https://127.0.0.1/x.jpg")).toBe(false);
  });

  it("rejects empty / malformed / non-string input", () => {
    expect(isProxiableImageUrl("")).toBe(false);
    expect(isProxiableImageUrl("not a url")).toBe(false);
    // @ts-expect-error — defensive against bad callers
    expect(isProxiableImageUrl(null)).toBe(false);
    // @ts-expect-error — defensive against bad callers
    expect(isProxiableImageUrl(undefined)).toBe(false);
  });
});

describe("toProxiedPhotoUrl — wrapping behaviour", () => {
  const ORIGINAL_BASE = process.env.BASE_URL;

  beforeEach(() => {
    process.env.BASE_URL = "https://shop.example";
  });

  afterEach(() => {
    if (ORIGINAL_BASE === undefined) delete process.env.BASE_URL;
    else process.env.BASE_URL = ORIGINAL_BASE;
  });

  it("rewrites an 8891 url to the proxy endpoint with the original url-encoded", () => {
    const raw = "https://p1.8891.com.tw/abc/photo.jpg";
    const out = toProxiedPhotoUrl(raw);
    expect(out).toBe(`https://shop.example/img/8891?u=${encodeURIComponent(raw)}`);
  });

  it("round-trips: the encoded u param decodes back to the original 8891 url", () => {
    const raw = "https://p1.8891.com.tw/a b/photo.jpg?x=1&y=2";
    const out = toProxiedPhotoUrl(raw);
    const u = new URL(out).searchParams.get("u");
    expect(u).toBe(raw);
  });

  it("passes non-8891 urls through unchanged (placeholder fallback)", () => {
    const raw = "https://via.placeholder.com/800x600?text=No+Photo";
    expect(toProxiedPhotoUrl(raw)).toBe(raw);
  });

  it("passes http 8891 urls through unchanged (only https is proxied)", () => {
    const raw = "http://p1.8891.com.tw/photo.jpg";
    expect(toProxiedPhotoUrl(raw)).toBe(raw);
  });

  it("passes empty string through unchanged", () => {
    expect(toProxiedPhotoUrl("")).toBe("");
  });

  it("falls back to the Railway base url when BASE_URL is unset", () => {
    delete process.env.BASE_URL;
    const raw = "https://p1.8891.com.tw/photo.jpg";
    const out = toProxiedPhotoUrl(raw);
    expect(out.startsWith("https://claude-code-remote-production.up.railway.app/img/8891?u=")).toBe(true);
  });
});
