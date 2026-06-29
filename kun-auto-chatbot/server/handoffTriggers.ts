import type { CustomerIntent } from "./vehicleDetectionService";

// ============ CRITICAL HIGH-INTENT HANDOFF DETECTION ============
//
// Jerry (2026-06-29): serious buyers skip the LINE rich menu and ask the
// make-or-break questions directly — price, negotiation, car condition,
// "is it still available". A WRONG AI answer to one of these loses the sale,
// and today the operator gets no fresh red-dot alert mid-conversation.
//
// Per Jerry's decision, ONLY the most critical question types auto-stop the AI
// and hand the customer to a real person:
//   1. 殺價 / 議價 / 出價   (price_negotiation)        — always
//   2. 詢價 / 多少錢        (pricing, on a real car)    — only when a vehicle is in context
//   3. 問車況              (accident / flood / repaint / mechanical probes)
//   4. 還在不在            (availability, on a real car)
//
// Everything else (general chat, loan questions, specs like mileage/colour,
// browsing) stays on the AI — those are answered from the DB or are low-stakes.
// This is a pure function so it can be unit-tested without LINE / DB / network.

export interface CriticalHandoffSignals {
  /** The raw customer message text. */
  message: string;
  /** Intents from detectCustomerIntents(). */
  intents: CustomerIntent[];
  /** True when vehicle detection resolved a specific car (directly or from context). */
  hasVehicle: boolean;
}

export interface CriticalHandoffResult {
  triggered: boolean;
  /** Short Mandarin reason label (for the operator card + analytics), or null. */
  reason: string | null;
}

// 問車況 — accident / flood / repaint / panel / mechanical condition probes.
// Broad words like 有沒有 only fire when anchored to a real condition keyword,
// so general "有沒有其他車" does NOT match.
const CONDITION_PATTERN =
  /車況|車的狀況|車的狀態|實車狀況|有沒有(?:出過|發生過)?(?:事故|車禍|泡水|淹水|撞)|事故車|泡水車|淹水車|泡過水|有泡水|撞過|有撞過|有撞到|擦撞|大樑|底盤(?:有|會|好)|引擎.{0,4}(?:狀況|問題|好嗎|ok|正常)|變速箱.{0,4}(?:問題|頓挫|正常)|鈑件|原鈑件|烤漆|重新烤漆|健康嗎|車有沒有問題|車有問題|認證.{0,4}(?:報告|嗎|過|的)|檢測報告|驗車|有無事故|事故紀錄|出險紀錄|維修紀錄|保固.{0,4}(?:嗎|多久|範圍)/;

// 還在不在 — a ready buyer checking the car is still for sale. Deliberately
// excludes the ambiguous bare "還有嗎" (often "還有其他車嗎" = browsing); we
// require a detected vehicle for these to fire.
const AVAILABILITY_PATTERN =
  /還在嗎|還在不在|還在不$|是否還在|還有在賣|還在賣嗎|還沒賣|沒賣掉|賣掉了嗎|賣出了嗎|售出了嗎|有沒有賣掉|車還在|還有貨|還能買嗎|還可以買嗎|現在還有嗎/;

/**
 * Decide whether a customer message is a critical, high-intent question that
 * should stop the AI and hand off to a real person.
 */
export function detectCriticalHandoff(s: CriticalHandoffSignals): CriticalHandoffResult {
  const message = (s.message || "").trim();
  if (!message) return { triggered: false, reason: null };

  const intents = s.intents || [];

  // 1. 殺價 / 議價 / 出價 — always a serious buyer.
  if (intents.includes("price_negotiation")) {
    return { triggered: true, reason: "殺價議價" };
  }

  // 2. 詢價 — only when tied to a specific vehicle (generic price browsing is not critical).
  if (intents.includes("pricing") && s.hasVehicle) {
    return { triggered: true, reason: "詢問車價" };
  }

  // 3. 問車況 — accident / flood / repaint / mechanical trust questions.
  if (CONDITION_PATTERN.test(message)) {
    return { triggered: true, reason: "詢問車況" };
  }

  // 4. 還在不在 — availability check on a real car.
  if (s.hasVehicle && AVAILABILITY_PATTERN.test(message)) {
    return { triggered: true, reason: "詢問是否還在" };
  }

  return { triggered: false, reason: null };
}
