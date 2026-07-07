/**
 * 崑家汽車 AI 客服系統 — 資安防護模組
 * 
 * 遵循標準：
 * - OWASP Top 10 (2021) + OWASP Top 10 for LLM Applications
 * - NIST Cybersecurity Framework (CSF 2.0)
 * - ISO 27001:2022 Information Security Management
 * - 台灣個人資料保護法 (PDPA)
 * 
 * 防護層級：
 * 1. HTTP Security Headers (Helmet)
 * 2. Rate Limiting (DDoS / Brute Force Protection)
 * 3. Input Sanitization (XSS / Injection Prevention)
 * 4. PII Encryption at Rest (AES-256-GCM)
 * 5. PII Masking in Logs
 * 6. LINE Webhook Signature Enforcement
 * 7. Request Size Limiting
 * 8. Security Audit Logging
 */

import crypto from "crypto";
import { logger } from "./logger";
import {
  FORBIDDEN_LOCATIONS,
  FORBIDDEN_DEALERSHIP_TERMS,
  LEAKY_FIELD_NAMES,
  SHOP_CITY,
  SHOP_PHONE,
} from "../shared/shopConfig";

// ============================================================
// 1. PII ENCRYPTION (AES-256-GCM) — NIST SP 800-38D
// ============================================================

// Use JWT_SECRET as the base for deriving encryption key
// In production, this should be a separate ENCRYPTION_KEY env var
function getEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing required environment variable: JWT_SECRET");
  // Derive a 32-byte key using SHA-256 (NIST approved KDF)
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypt PII data using AES-256-GCM
 * Returns format: iv:authTag:ciphertext (all base64)
 */
export function encryptPII(plaintext: string): string {
  if (!plaintext) return plaintext;
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM (NIST recommended)
  
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:ciphertext
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Decrypt PII data encrypted with AES-256-GCM
 */
export function decryptPII(ciphertext: string): string {
  if (!ciphertext) return ciphertext;
  
  // Check if it's actually encrypted (contains the : separator pattern)
  if (!ciphertext.includes(":") || ciphertext.split(":").length !== 3) {
    // Not encrypted, return as-is (backward compatibility for existing data)
    return ciphertext;
  }
  
  try {
    const key = getEncryptionKey();
    const [ivB64, authTagB64, encryptedB64] = ciphertext.split(":");
    
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");
    
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedB64, "base64", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (err) {
    // If decryption fails, the data might not be encrypted (legacy data)
    logger.warn("Security", "Decryption failed, returning raw value (may be unencrypted legacy data)");
    return ciphertext;
  }
}

/**
 * Check if a value is already encrypted
 */
export function isEncrypted(value: string): boolean {
  if (!value || !value.includes(":")) return false;
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  // Check if parts look like base64
  const b64Pattern = /^[A-Za-z0-9+/=]+$/;
  return parts.every(p => b64Pattern.test(p));
}

// ============================================================
// 2. PII MASKING — ISO 27001 A.8.11 Data Masking
// ============================================================

/**
 * Mask phone number for display: 0912-345-678 → 0912-***-678
 */
export function maskPhone(phone: string): string {
  if (!phone) return phone;
  // Handle formatted: 0912-345-678
  const formatted = phone.replace(/[\s-]/g, "");
  if (formatted.length === 10 && formatted.startsWith("09")) {
    return `${formatted.slice(0, 4)}-***-${formatted.slice(7)}`;
  }
  // Generic masking: show first 3 and last 3
  if (formatted.length >= 6) {
    return formatted.slice(0, 3) + "*".repeat(formatted.length - 6) + formatted.slice(-3);
  }
  return "***";
}

/**
 * Mask name for display: 賴崑家 → 賴*家
 */
export function maskName(name: string): string {
  if (!name) return name;
  if (name.length <= 1) return "*";
  if (name.length === 2) return name[0] + "*";
  return name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
}

/**
 * Mask email for display: user@example.com → u***@example.com
 */
export function maskEmail(email: string): string {
  if (!email) return email;
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  if (local.length <= 1) return `*@${domain}`;
  return `${local[0]}${"*".repeat(Math.min(local.length - 1, 5))}@${domain}`;
}

/**
 * Mask LINE userId for display: U5591c54539693c8b5d815e179e6f300d → U559...300d
 */
export function maskUserId(userId: string): string {
  if (!userId) return userId;
  if (userId.length <= 8) return "***";
  return `${userId.slice(0, 4)}...${userId.slice(-4)}`;
}

// The shop's own phone number, digits-only, for exact-match comparison
// regardless of how it's written in the text (with hyphens, spaces, or
// a leading +886/886 country code).
const SHOP_PHONE_DIGITS = SHOP_PHONE.replace(/\D/g, "");

// Placeholder token used to temporarily shield the shop's own phone
// number from the masking passes below, then restore it verbatim
// afterwards. Not a valid phone-number shape, so it can't collide with
// (or be re-matched by) any of the masking regexes.
const SHOP_PHONE_PLACEHOLDER = "SHOP_PHONE_SENTINEL";

/**
 * Mask PII in a message string (for safe logging)
 * Detects and masks: phone numbers, email addresses, LINE IDs
 *
 * Exception: the dealership's OWN phone number (SHOP_PHONE) is never
 * masked. AI replies legitimately quote it (e.g. "電洽 0936-812-818"), and
 * naively masking it produces an unusable "0936-***-818" in stored
 * transcripts / the admin dashboard. Customer-provided phone numbers are
 * unaffected — only an exact digit-for-digit match of SHOP_PHONE is
 * protected, in any of its common written forms (as configured with
 * hyphens, digits-only, spaced, or with a +886/886 prefix).
 */
export function maskPIIInText(text: string): string {
  if (!text) return text;

  let masked = text;

  // Shield the shop's own number before masking, in whatever shape it's
  // written. Any match whose digits equal SHOP_PHONE's digits is replaced
  // with a placeholder; matches with different digits (e.g. a customer's
  // number) are left untouched here and get masked normally below.
  const protectedMatches: string[] = [];
  if (SHOP_PHONE_DIGITS) {
    masked = masked.replace(
      /(?:\+886|886)?[\s-]?0?9\d{2}[\s-]?\d{3}[\s-]?\d{3}/g,
      (match) => {
        const digits = match.replace(/\D/g, "").replace(/^886/, "0");
        if (digits === SHOP_PHONE_DIGITS) {
          protectedMatches.push(match);
          return SHOP_PHONE_PLACEHOLDER;
        }
        return match;
      }
    );
  }

  // Mask Taiwan phone numbers
  masked = masked.replace(/09\d{2}[\s-]?\d{3}[\s-]?\d{3}/g, (match) => maskPhone(match));
  masked = masked.replace(/(?:\+886|886)[\s-]?0?9\d{2}[\s-]?\d{3}[\s-]?\d{3}/g, (match) => maskPhone(match));

  // Mask landline numbers
  masked = masked.replace(/0[2-9][\s-]?\d{3,4}[\s-]?\d{4}/g, (match) => maskPhone(match));

  // Mask email addresses
  masked = masked.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (match) => maskEmail(match));

  // Mask LINE User IDs (U followed by 32 hex chars)
  masked = masked.replace(/U[0-9a-f]{32}/g, (match) => maskUserId(match));

  // Restore the shop's own phone number(s), verbatim as originally written.
  if (protectedMatches.length > 0) {
    let i = 0;
    masked = masked.replace(new RegExp(SHOP_PHONE_PLACEHOLDER, "g"), () => protectedMatches[i++]);
  }

  return masked;
}

// ============================================================
// 3. INPUT SANITIZATION — OWASP Input Validation
// ============================================================

/**
 * Sanitize user input to prevent XSS attacks
 * Strips HTML tags and encodes special characters
 */
export function sanitizeInput(input: string): string {
  if (!input) return input;
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, "");
  
  // Encode common XSS vectors
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
  
  return sanitized;
}

/**
 * Validate and sanitize chat message input
 * - Max length enforcement
 * - Strip control characters
 * - Prevent prompt injection patterns
 */
export function sanitizeChatMessage(message: string, maxLength: number = 2000): string {
  if (!message) return message;
  
  // Enforce max length
  let sanitized = message.slice(0, maxLength);
  
  // Remove control characters (except newline and tab)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  
  // Basic prompt injection detection - log but don't block
  // (We want to detect attempts but not break legitimate messages)
  const promptInjectionPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /you\s+are\s+now\s+(?:a\s+)?(?:DAN|jailbreak)/i,
    /system\s*:\s*/i,
    /\[INST\]/i,
    /<<SYS>>/i,
  ];
  
  for (const pattern of promptInjectionPatterns) {
    if (pattern.test(sanitized)) {
      logger.warn("Security", `Potential prompt injection detected (pattern: ${pattern.source})`);
      // Don't block - just log. The system prompt should be robust enough.
      break;
    }
  }
  
  return sanitized;
}

/**
 * Sanitize search query to prevent SQL injection via LIKE patterns
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return query;
  
  // Escape SQL LIKE special characters
  return query
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .slice(0, 200); // Max search query length
}

// ============================================================
// 4. SECURITY AUDIT LOGGING — ISO 27001 A.8.15
// ============================================================

export type SecurityEventType = 
  | "auth_success"
  | "auth_failure"
  | "pii_access"
  | "pii_export"
  | "admin_action"
  | "rate_limit_hit"
  | "webhook_signature_invalid"
  | "prompt_injection_attempt"
  | "suspicious_activity";

export interface SecurityEvent {
  timestamp: string;
  eventType: SecurityEventType;
  severity: "low" | "medium" | "high" | "critical";
  source: string;
  details: string;
  ip?: string;
  userId?: string;
}

// In-memory security event buffer (last 1000 events)
const securityEvents: SecurityEvent[] = [];
const MAX_SECURITY_EVENTS = 1000;

/**
 * Log a security event
 */
export function logSecurityEvent(event: Omit<SecurityEvent, "timestamp">): void {
  const fullEvent: SecurityEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  
  securityEvents.push(fullEvent);
  
  // Trim buffer
  if (securityEvents.length > MAX_SECURITY_EVENTS) {
    securityEvents.splice(0, securityEvents.length - MAX_SECURITY_EVENTS);
  }
  
  // Log high/critical events to console (masked)
  if (event.severity === "high" || event.severity === "critical") {
    logger.warn("Security", `[${event.severity.toUpperCase()}] ${event.eventType}: ${maskPIIInText(event.details)}`);
  }
}

/**
 * Get recent security events (for admin dashboard)
 */
export function getSecurityEvents(limit: number = 50): SecurityEvent[] {
  return securityEvents.slice(-limit).reverse();
}

// ============================================================
// 5. RATE LIMITING CONFIGURATION
// ============================================================

export const RATE_LIMIT_CONFIG = {
  // General API: 100 requests per 15 minutes per IP
  general: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "請求過於頻繁，請稍後再試。" },
  },
  // Chat API: 30 messages per 5 minutes per IP (prevent spam)
  chat: {
    windowMs: 5 * 60 * 1000,
    max: 30,
    message: { error: "訊息發送過於頻繁，請稍後再試。" },
  },
  // LINE Webhook: 200 per minute (LINE may send bursts)
  lineWebhook: {
    windowMs: 60 * 1000,
    max: 200,
    message: { error: "Too many requests" },
  },
  // Admin API: 60 per minute
  admin: {
    windowMs: 60 * 1000,
    max: 60,
    message: { error: "請求過於頻繁，請稍後再試。" },
  },
};

// ============================================================
// 6. WEBHOOK SIGNATURE VERIFICATION
// ============================================================

/**
 * Verify LINE webhook signature (HMAC-SHA256)
 * Returns true if signature is valid, false otherwise
 */
export function verifyLineWebhookSignature(
  body: string,
  signature: string,
  channelSecret: string
): boolean {
  if (!signature || !channelSecret) return false;
  
  const hash = crypto
    .createHmac("SHA256", channelSecret)
    .update(body)
    .digest("base64");
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, "utf8"),
      Buffer.from(signature, "utf8")
    );
  } catch {
    return false;
  }
}

// ============================================================
// 7. SESSION ID SECURITY
// ============================================================

/**
 * Generate a secure session ID
 */
export function generateSecureSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Validate session ID format (prevent injection)
 */
export function isValidSessionId(sessionId: string): boolean {
  // Allow alphanumeric, hyphens, and underscores only
  // Max 128 chars
  return /^[a-zA-Z0-9_-]{1,128}$/.test(sessionId);
}

// ============================================================
// 8. LLM OUTPUT GUARDRAILS — OWASP LLM02 (Insecure Output Handling)
// ============================================================
// Based on the Guardrails pattern from Agentic Design Patterns.
// Complements input-side sanitizeChatMessage() by validating
// what the LLM returns BEFORE it reaches the customer on LINE.
//
// Business rationale (Taiwan car dealership):
// - 消保法: hallucinated prices create legal liability
// - 廣告法: absolute claims ("保證最低價") are prohibited
// - PDPA:   LLM must not echo third-party PII back to users
// - OWASP LLM02: never trust model output verbatim

export interface LLMOutputValidation {
  safe: boolean;
  sanitized: string;
  violations: string[];
}

/**
 * Enforcement mode for the LLM output guardrail.
 * - "enforce":  rewrite/strip unsafe content and fall back on critical violations
 * - "log_only": log violations but return the original text unchanged
 *
 * Controlled via env var LLM_GUARDRAIL_MODE. Defaults to "enforce"
 * so the guardrail actively protects users against 廣告法 / PDPA /
 * OWASP LLM02 violations. Set LLM_GUARDRAIL_MODE=log_only to
 * temporarily disable enforcement (e.g. for debugging false positives).
 */
export type GuardrailMode = "enforce" | "log_only";

export function getGuardrailMode(): GuardrailMode {
  const raw = (process.env.LLM_GUARDRAIL_MODE || "enforce").toLowerCase();
  return raw === "log_only" ? "log_only" : "enforce";
}

// Phrases that create legal/regulatory exposure in TW automotive advertising.
// Keep this list conservative — false positives are cheap, legal fines are not.
const UNSAFE_PROMISE_PATTERNS: RegExp[] = [
  /保證(最低價|過件|核准|通過)/,
  /100\s*%\s*(過件|核准|通過|滿意)/,
  /絕對(最便宜|最低|零風險)/,
  /無息(免手續費)?貸款/,
  /免(審核|對保|保人)(.*?)核准/,
];

// Patterns that look like a hallucinated price quote (NT$ amounts).
// We don't block — we flag for the caller to cross-check against inventory.
const PRICE_QUOTE_PATTERN = /(?:NT\$|新台幣|\$)\s*[\d,]+(?:\.\d+)?\s*(?:萬|元|k|K)?|\d+(?:\.\d+)?\s*萬/g;

// ------------------------------------------------------------
// Price-context exemptions — 2026-07-07 false-positive fix.
//
// PRICE_QUOTE_PATTERN matches ANY "N萬" in the reply, but replies
// constantly contain non-sale-price 萬 numbers: mileage ("里程12萬公里"),
// loan figures ("頭期款5萬" / "月付1.2萬"), and budget talk ("預算50萬以內" /
// "50萬以下"). Before this fix, any such number not in allowedPrices was
// flagged CRITICAL and the entire (otherwise safe) reply was discarded.
//
// These checks only SKIP the price-mismatch check for a given match — they
// never weaken PRICE_QUOTE_PATTERN itself, and a genuine sale-price claim
// (e.g. "這台65.9萬" / "售價80.9萬") with no such context is still checked
// against allowedPrices exactly as before.
// ------------------------------------------------------------
const MILEAGE_UNIT_RE = /^\s{0,2}(?:公里|km|KM|公裏)/i;
const LOAN_TERM_RE = /頭期款|頭期|自備款|首付|月付|月繳|月供|貸款額度/;
const BUDGET_SUFFIX_RE = /^\s{0,2}(?:以下|以內|上下|以上|左右的預算)/;
const BUDGET_PREFIX_RE = /預算/;

/**
 * Determine whether a PRICE_QUOTE_PATTERN match at [matchIndex, matchIndex+matchLength)
 * in `text` is clearly NOT a sale-price claim (mileage / loan / budget context),
 * and should therefore be skipped by the price-mismatch check.
 */
function isNonSalePriceContext(text: string, matchIndex: number, matchLength: number): boolean {
  const matchEnd = matchIndex + matchLength;
  const before = text.slice(Math.max(0, matchIndex - 6), matchIndex);
  const afterMileage = text.slice(matchEnd, matchEnd + 3);
  const afterBudget = text.slice(matchEnd, matchEnd + 6);

  // (a) mileage: "12萬公里" / "跑了8萬km"
  if (MILEAGE_UNIT_RE.test(afterMileage)) return true;

  // (b) loan figures: "頭期款5萬" / "月付1.2萬"
  if (LOAN_TERM_RE.test(before)) return true;

  // (c) budget talk: "50萬以下" / "50萬左右的預算" / "預算50萬以內"
  if (BUDGET_SUFFIX_RE.test(afterBudget)) return true;
  if (BUDGET_PREFIX_RE.test(before)) return true;

  return false;
}

// Prompt/system-rule leakage indicators (signs injection succeeded).
const SYSTEM_LEAK_PATTERNS: RegExp[] = [
  /system\s*prompt\s*[:：]/i,
  /你的\s*(系統)?指令是/,
  /I am an? (AI|LLM|language model) (trained|developed)/i,
  /ignore (all )?previous instructions/i,
  /<\|.*?\|>/,  // chat template tokens
];

/**
 * Validate and sanitize LLM output before sending to the user.
 *
 * @param llmOutput   Raw text returned by the LLM
 * @param options.allowedPrices  If provided, any price quote NOT in this set
 *                               is flagged as a potential hallucination.
 *                               Pass the real inventory prices from the DB.
 * @returns { safe, sanitized, violations }
 *          - safe:       true if no critical violations (caller may still
 *                        review `violations` for warnings)
 *          - sanitized:  output with system-leak fragments stripped
 *          - violations: human-readable list for audit logging
 */
/**
 * Common car brand+model names the LLM might hallucinate when not constrained.
 * These are popular Taiwan-market vehicles often seen in training data.
 * Each pattern is a brand+model combo — we only flag if the brand/model is
 * NOT in the actual inventory list passed by the caller.
 *
 * Format: lowercase brand-model strings (no spaces, no separators).
 */
const COMMON_HALLUCINATED_VEHICLES = [
  // Toyota
  "toyotarav4", "rav4",
  "toyotacamry", "camry",
  "toyotaaltis", "altis",
  "toyotayaris", "yaris",
  "toyotahilux", "hilux",
  "toyotachr", "chr",
  // Honda
  "hondacrv", "crv", "cr-v",
  "hondacivic", "civic",
  "hondahrv", "hrv", "hr-v",
  "hondafit", "fit",
  "hondaaccord", "accord",
  // Nissan
  "nissankicks", "kicks",
  "nissansentra", "sentra",
  "nissanxtrail", "x-trail", "xtrail",
  "nissanaltima", "altima",
  // Mazda (other than what's typically in stock — caller filters)
  "mazda3", "mazda6", "mazdacx3", "cx-3", "cx3", "mazdacx9", "cx-9", "cx9",
  // Other common Taiwan market
  "fordfocus", "fordfiesta", "fordkuga",
  "vwgolf", "golf",
  "audia3", "audia4", "audia5", "audiq3", "audiq5", "audiq7",
  "bmw3series", "3-series", "5series", "5-series",
  "benzc-class", "benze-class", "benzgla", "benzglc",
];

/**
 * Check if the LLM output mentions vehicle brand/model names that are NOT
 * in the actual inventory. This catches hallucinations like "Toyota RAV4"
 * when we only have CX-5/X1/Tucson etc.
 *
 * @param text       LLM output to check
 * @param inventory  Real inventory ["Mazda CX-5", "BMW X1", ...] — brand+model
 * @returns          Array of hallucinated mentions found (empty if clean)
 */
function detectHallucinatedVehicles(text: string, inventory: string[]): string[] {
  // Normalize: remove spaces, hyphens, lowercase. "Toyota RAV4" → "toyotarav4"
  const norm = (s: string) => s.toLowerCase().replace(/[\s\-_]/g, "");
  const inventoryNorm = new Set(inventory.map(norm));
  // Also include just the model part for fuzzy match (e.g., "rav4" alone)
  for (const item of inventory) {
    const parts = item.split(/\s+/);
    if (parts.length >= 2) inventoryNorm.add(norm(parts.slice(1).join("")));
  }

  const textNorm = norm(text);
  const hits: string[] = [];
  for (const candidate of COMMON_HALLUCINATED_VEHICLES) {
    if (textNorm.includes(candidate) && !inventoryNorm.has(candidate)) {
      // Double-check no inventory item ends with this candidate
      // (e.g. "Mazda CX-5" — when candidate is "cx-5" it should NOT trigger)
      let safe = false;
      inventoryNorm.forEach(inv => {
        if (!safe && (inv.endsWith(candidate) || inv === candidate)) safe = true;
      });
      if (!safe) hits.push(candidate);
    }
  }
  return hits;
}

/**
 * Phrases where the LLM is CLAIMING where our shop is located.
 * We capture 2–8 Chinese chars immediately after each phrase as the
 * candidate location, then check against FORBIDDEN_LOCATIONS.
 *
 * Split into separate patterns (not one mega-alternation) so each can
 * be tuned independently and so logs pinpoint which claim triggered.
 *
 * 2026-04-23 hardening (adversarial audit):
 * - Added verbs: 身處, 坐落(在|於), 座落於, 位於, 地址位於, 地址設在
 * - Added subjects: 本店, 門市, 我司, 分店, 總店, 展間, 據點
 * - Allow up to 3 punctuation/space chars between verb and location
 *   to catch `我們在，台北內湖` / `我們位於 台北 內湖` style evasions.
 *
 * GAP_BRIDGE_SEP (`[\s，,、。的]{0,3}`) is the small optional bridge between
 * the matched verb and the captured location. Keep it narrow — widening to
 * `.{0,3}` would let unrelated sentences collide.
 */
const GAP_BRIDGE_SEP = "[\\s，,、。的]{0,3}";
const LOC_CAPTURE = "([一-龥]{2,10})";
// Verbs that signal "we/the shop is AT <location>".
// Using a broad alternation keeps the regex readable; new verbs go here.
const LOC_VERBS = "(?:在|位於|地址位於|地址設在|地址設於|身處|落腳(?:在|於)?|開(?:在|於)?|座落(?:在|於)?|坐落(?:在|於)?|設(?:在|於)?|來自|駐(?:在|於))";
const OUR_LOCATION_CLAIM_PATTERNS: RegExp[] = [
  // Subject = 我們 / 我司 / 本店 / 本公司 (+ optional qualifier)
  new RegExp(`(?:我們|我司|本店|本公司|本社|敝店|敝公司)(?:的店|公司|店面|門市)?${LOC_VERBS}${GAP_BRIDGE_SEP}${LOC_CAPTURE}`, "g"),
  // Subject = 崑家 / 崑家汽車
  new RegExp(`崑家(?:汽車)?${LOC_VERBS}${GAP_BRIDGE_SEP}${LOC_CAPTURE}`, "g"),
  // Subject = 店 / 店址 / 店面 / 店裡 / 門市 / 分店 / 總店 / 展間 / 據點
  new RegExp(`(?:店址|店面|店裡|店|門市|分店|總店|展間|展示(?:中心|間)|據點)${LOC_VERBS}${GAP_BRIDGE_SEP}${LOC_CAPTURE}`, "g"),
  // Address phrasing
  /(?:我們的)?地址(?:是|在|位於|設(?:在|於))\s*([一-龥]{2,12})/g,
];

/**
 * Detects LLM output claiming our shop is in a location we forbid.
 *
 * Example trigger (2026-04-23 real incident):
 *   "老闆我們在台北內湖喔" → ["台北 in \"我們在台北\"", "內湖 in \"我們在台北內湖\""]
 *
 * Example non-trigger (customer-origin phrases):
 *   "從台北來歡迎" → [] (no claim pattern matched — customer's origin, not ours)
 *
 * @param text LLM output to check
 * @returns Array of violation descriptions (empty if clean)
 */
function detectForbiddenLocationClaims(text: string): string[] {
  const hits: string[] = [];
  const seen = new Set<string>();

  for (const pattern of OUR_LOCATION_CLAIM_PATTERNS) {
    // Create a fresh regex per call to reset lastIndex (global flag side effect)
    const re = new RegExp(pattern.source, pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const claimed = m[1] || "";
      for (const forbidden of FORBIDDEN_LOCATIONS) {
        if (claimed.includes(forbidden) && !seen.has(forbidden)) {
          // Suppress if SHOP_CITY is also in the claimed string — means the
          // LLM said both (e.g., "我們在高雄不是台北") which is a correction,
          // not a false claim. Very rare but worth guarding.
          if (!claimed.includes(SHOP_CITY)) {
            hits.push(`${forbidden} in "${m[0]}"`);
            seen.add(forbidden);
          }
        }
      }
    }
  }
  return hits;
}

/**
 * Detects LLM output using phrases that imply we sell new cars.
 *
 * Example trigger (2026-04-23 real incident):
 *   "Mufasa 2.0 GLC旗艦版是新車價格很硬" → ["是新車", "新車價"]
 *
 * Substring match is the default because every phrase in
 * FORBIDDEN_DEALERSHIP_TERMS is already a confident signal. BUT some
 * terms end in "...新車" and the next Chinese char drastically changes
 * meaning:
 *   - 這台新車款  → "this new model" — legitimate (NOT new-car claim)
 *   - 這款新車主  → "owner of a new vehicle" — legitimate
 *   - 這台新車型  → "this new model/type" — legitimate
 * We whitelist those suffixes per-term so we don't false-positive on them.
 *
 * @param text LLM output to check
 * @returns Array of matched phrases (empty if clean)
 */
const DEALERSHIP_TERM_SUFFIX_WHITELIST: Record<string, string[]> = {
  "這台新車": ["款", "型", "主"],
  "這款新車": ["款", "型", "主"],
  "是新車": ["款", "型", "主"],
};

function detectForbiddenDealershipTerms(text: string): string[] {
  const hits: string[] = [];
  for (const term of FORBIDDEN_DEALERSHIP_TERMS) {
    let searchFrom = 0;
    while (true) {
      const idx = text.indexOf(term, searchFrom);
      if (idx === -1) break;
      const whitelist = DEALERSHIP_TERM_SUFFIX_WHITELIST[term];
      const nextChar = text[idx + term.length] || "";
      if (whitelist && whitelist.includes(nextChar)) {
        // Legitimate suffix ("款" / "型" / "主") — not a new-car claim.
        searchFrom = idx + term.length;
        continue;
      }
      hits.push(term);
      break; // one hit per term is enough
    }
  }
  return hits;
}

/**
 * Detects leaked backend DB field names (e.g., "newCarPrice") that should
 * never appear in customer-facing text. Also catches common label leaks
 * like "新車原價" when used as a labeled value.
 *
 * These leaks typically happen when a prompt-building function accidentally
 * serializes a raw DB row with field names intact.
 *
 * @param text LLM output to check
 * @returns Array of leaked field names (empty if clean)
 */
function detectLeakedFieldNames(text: string): string[] {
  const hits: string[] = [];
  const lower = text.toLowerCase();
  for (const field of LEAKY_FIELD_NAMES) {
    if (lower.includes(field.toLowerCase())) {
      hits.push(field);
    }
  }
  return hits;
}

export function validateLLMOutput(
  llmOutput: string,
  options: { allowedPrices?: string[]; inventory?: string[] } = {}
): LLMOutputValidation {
  const violations: string[] = [];
  let sanitized = llmOutput ?? "";

  if (!sanitized) {
    return { safe: true, sanitized, violations };
  }

  // 1. Unsafe promises (廣告法) — CRITICAL, block the phrase.
  for (const pattern of UNSAFE_PROMISE_PATTERNS) {
    if (pattern.test(sanitized)) {
      violations.push(`unsafe_promise:${pattern.source}`);
      sanitized = sanitized.replace(pattern, "[依實際狀況為準]");
    }
  }

  // 2. System prompt leakage — CRITICAL, strip the line.
  for (const pattern of SYSTEM_LEAK_PATTERNS) {
    if (pattern.test(sanitized)) {
      violations.push(`system_leak:${pattern.source}`);
      sanitized = sanitized.replace(pattern, "");
    }
  }

  // 3. PII echo — LLM should never return phone/email in responses.
  //    If it does, mask it rather than leak.
  const piiBefore = sanitized;
  sanitized = maskPIIInText(sanitized);
  if (piiBefore !== sanitized) {
    violations.push("pii_echo");
  }

  // 4. Hallucinated price detection (CRITICAL as of 2026-04-23).
  //    Was advisory — upgraded to hard-fail after the "98.9萬 vs 80.9萬"
  //    incident on the Mufasa 2.0 GLC旗艦版 conversation. Wrong prices are
  //    direct customer fraud and cannot be sent.
  //
  //    2026-07-07: skip matches that are clearly mileage/loan/budget talk
  //    (not a sale-price claim) via isNonSalePriceContext — see that
  //    function's comment for the false-positive incidents this fixes.
  if (options.allowedPrices && options.allowedPrices.length > 0) {
    const normalize = (s: string) => s.replace(/[\s,NT$新台幣元]/g, "").toLowerCase();
    const allowedSet = new Set(options.allowedPrices.map(normalize));
    // Array.from(...) rather than a direct for-of over the iterator —
    // this codebase's tsconfig target doesn't enable downlevelIteration,
    // so iterating a RegExpStringIterator directly fails to compile.
    for (const m of Array.from(sanitized.matchAll(PRICE_QUOTE_PATTERN))) {
      const quote = m[0];
      const idx = m.index ?? 0;
      if (isNonSalePriceContext(sanitized, idx, quote.length)) continue;
      if (!allowedSet.has(normalize(quote))) {
        violations.push(`price_not_in_inventory:${quote}`);
      }
    }
  }

  // 5. Hallucinated vehicle detection (CRITICAL — promises a car we don't have
  //    is direct customer fraud). Only fires if caller passes the real inventory.
  if (options.inventory && options.inventory.length > 0) {
    const ghosts = detectHallucinatedVehicles(sanitized, options.inventory);
    for (const g of ghosts) {
      violations.push(`hallucinated_vehicle:${g}`);
    }
  }

  // 6. Forbidden location claims (CRITICAL — 2026-04-23 "台北內湖" incident).
  //    The LLM claimed the shop is in a city/district we are NOT in.
  const wrongLocations = detectForbiddenLocationClaims(sanitized);
  for (const loc of wrongLocations) {
    violations.push(`forbidden_location:${loc}`);
  }

  // 7. Forbidden dealership-type terms (CRITICAL — 2026-04-23 "新車" incident).
  //    We are a used-car dealer; phrases like "新車價" / "這是新車" are misrepresentation.
  const wrongTerms = detectForbiddenDealershipTerms(sanitized);
  for (const term of wrongTerms) {
    violations.push(`forbidden_dealership_term:${term}`);
  }

  // 8. Leaked backend field names (CRITICAL — prompt hygiene).
  //    "newCarPrice" was the source field for the 98.9萬 hallucination; if it
  //    or similar labels appear in user-facing text, the prompt/KB is broken.
  const leaked = detectLeakedFieldNames(sanitized);
  for (const field of leaked) {
    violations.push(`leaked_field_name:${field}`);
  }

  // Classify: all fact-violation types are hard fails. Caller MUST fall back
  // to generateRuleBasedReply (or equivalent safe path) when safe=false.
  const critical = violations.some(
    v => v.startsWith("system_leak:") ||
         v.startsWith("unsafe_promise:") ||
         v.startsWith("hallucinated_vehicle:") ||
         v.startsWith("price_not_in_inventory:") ||
         v.startsWith("forbidden_location:") ||
         v.startsWith("forbidden_dealership_term:") ||
         v.startsWith("leaked_field_name:")
  );

  if (violations.length > 0) {
    logSecurityEvent({
      eventType: "suspicious_activity",
      severity: critical ? "high" : "medium",
      source: "llm_output_guardrail",
      details: `LLM output violations: ${violations.join(", ")}`,
    });
  }

  return { safe: !critical, sanitized, violations };
}
