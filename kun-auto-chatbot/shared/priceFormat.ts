/**
 * Safe price formatting for vehicle displays.
 *
 * Shared helper used by both text-reply paths (ruleBasedReply) and Flex
 * card renderers (lineFlexTemplates). Guarantees we never emit
 * "undefined萬" / "null萬" / "NaN萬" to customers.
 *
 * Two variants exist because the fallback phrase differs by medium:
 *   - Text reply: "價格請電聯 {SHOP_PHONE} 確認" (full sentence fits prose)
 *   - Flex card: "電洽 {SHOP_PHONE}" (short — fits the card price field)
 *
 * Both variants share the same extraction logic via `extractPriceString`.
 * If you change the validation rules (e.g., what counts as a "valid" price),
 * change extractPriceString and both call sites benefit.
 */

import { SHOP_PHONE } from "./shopConfig";

/**
 * Minimal shape accepted by the price formatters. Intentionally loose so
 * we don't couple to the full Drizzle Vehicle type (some callers have
 * partial objects, e.g., detection payloads).
 */
export interface VehicleLikeForPrice {
  price?: number | string | null;
  priceDisplay?: string | null;
}

/**
 * Extract a clean display-ready price string from a vehicle row, or null
 * if neither field is usable. Callers decide what fallback phrase to show.
 *
 * Rules:
 *   1. priceDisplay wins if it's a non-empty trimmed string.
 *   2. Otherwise, numeric price is formatted as "{n}萬" — BUT only if
 *      it's a real positive number (NaN / 0 / negative fall through).
 *   3. Placeholder strings like "TBD" / "待定" are NOT filtered here —
 *      callers are responsible for those (this keeps the helper dumb).
 */
export function extractPriceString(v: VehicleLikeForPrice | null | undefined): string | null {
  const display = v?.priceDisplay;
  if (typeof display === "string" && display.trim() !== "") {
    return display.trim();
  }
  const num = v?.price;
  if (num != null && !isNaN(Number(num)) && Number(num) > 0) {
    return `${num}萬`;
  }
  return null;
}

/**
 * Format for text replies (chat / rule-based output).
 * Falls back to a full-sentence handoff phrase.
 */
export function formatVehiclePriceSafe(v: VehicleLikeForPrice | null | undefined): string {
  return extractPriceString(v) ?? `價格請電聯 ${SHOP_PHONE} 確認`;
}

/**
 * Format for LINE Flex card price fields. Short variant — the card's price
 * label is a single small field, so a full sentence wouldn't fit cleanly.
 */
export function formatPriceForCard(v: VehicleLikeForPrice | null | undefined): string {
  return extractPriceString(v) ?? `電洽 ${SHOP_PHONE}`;
}
