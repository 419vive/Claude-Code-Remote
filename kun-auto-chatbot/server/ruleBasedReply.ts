/**
 * Rule-Based Reply Engine
 *
 * When FORCE_RULE_BASED_REPLY=1, the chatbot responds using pattern matching
 * instead of calling the LLM API. This saves API costs while still providing
 * useful responses to common customer inquiries.
 *
 * Uses existing vehicle detection and intent detection from vehicleDetectionService.
 */

import type { QuestionType } from "./vehicleDetectionService";
import {
  SHOP_PHONE,
  SHOP_ADDRESS,
  SHOP_MAP_URL,
  SHOP_HOURS,
  SHOP_LINE_ID,
} from "../shared/shopConfig";
import { formatVehiclePriceSafe as sharedFormatVehiclePriceSafe } from "../shared/priceFormat";

// Legacy aliases — kept local so downstream code in this file reads naturally.
// Single source of truth is ../shared/shopConfig.
const STORE_PHONE = SHOP_PHONE;
const STORE_ADDRESS = SHOP_ADDRESS;
const STORE_MAP = SHOP_MAP_URL;
const STORE_HOURS = SHOP_HOURS;
const LINE_ID = SHOP_LINE_ID;

/**
 * Format a vehicle's price safely, never producing "undefined萬" / "null萬".
 *
 * Thin re-export of ../shared/priceFormat.formatVehiclePriceSafe. Kept
 * named-exported from this module because factLock.test.ts and other
 * consumers already import it from here. See shared/priceFormat.ts for
 * the implementation + full rationale.
 */
export function formatVehiclePriceSafe(v: any): string {
  return sharedFormatVehiclePriceSafe(v);
}

export function isRuleBasedMode(): boolean {
  return process.env.FORCE_RULE_BASED_REPLY === "1";
}

type RuleContext = {
  userMessage: string;
  greeting: string; // 大哥/小姐/人客
  detection: {
    type: string;
    vehicle: any | null;
    questionType: QuestionType;
    directAnswer: string;
    termExplanation?: string;
  };
  intents: string[];
  customerContact: string | null;
  leadScore?: number;
  // Customer preferences (prevent re-asking)
  customerBudget?: number | null;
  customerBudgetRange?: string | null;
  customerPreferredBrand?: string | null;
  customerPreferredBodyType?: string | null;
  customerPreferredVisitTime?: string | null;
};

/**
 * Generate a rule-based reply without calling the LLM.
 * Returns the reply text.
 */
export function generateRuleBasedReply(ctx: RuleContext): string {
  const { userMessage, greeting, detection, intents, customerContact } = ctx;
  const lower = userMessage.toLowerCase();

  // === Priority 1: Inquiry button (structured "我想詢問這台車" or "我想了解這台") ===
  if (detection.type === "inquiry_button" && detection.vehicle) {
    return buildVehicleInquiryReply(detection.vehicle, greeting, customerContact);
  }

  // === Priority 1.5: Inquiry button clicked but vehicle not in DB (likely sold) ===
  // Style aligned with LLM prompt: 一段話、不分段、不用句點
  if (detection.type === "inquiry_button" && !detection.vehicle) {
    return `${greeting}不好意思這台車目前已經不在庫存了可能已經售出囉！不過我們還有很多好車可以看，你可以點下方「看車庫存」瀏覽目前在售的車輛，或告訴我你想找什麼條件的車我幫你推薦`;
  }

  // === Priority 2: Specific vehicle + specific question ===
  if (detection.vehicle && detection.questionType !== "general") {
    return buildVehicleAnswerReply(detection, greeting);
  }

  // === Priority 3: Specific vehicle, general inquiry ===
  if (detection.vehicle) {
    return buildVehicleGeneralReply(detection.vehicle, greeting, customerContact);
  }

  // === Priority 3.5a: Fallback — detection couldn't determine intent ===
  if (detection.type === 'fallback') {
    return `${greeting}感謝你的訊息！你可以點下方選單的「看車庫存」瀏覽我們目前在售的車款，或直接告訴我你想找什麼車，我幫你推薦！`;
  }

  // === Priority 3.5: Follow-up question but no vehicle found in context ===
  if (detection.type === 'context_missing') {
    return `${greeting}你問的是哪一台車呢？你可以點下方選單的「看車庫存」瀏覽我們目前在售的車款，或直接告訴我你想了解哪台車！`;
  }

  // === Priority 3.6: New-car question (reviewer M2 — 2026-04-23 PM) ===
  // Must come BEFORE intent-based replies so it wins over any generic path.
  // The LLM primary reply for this intent can fall back here if the security
  // guardrail trips — we must produce the clarification WITHOUT naming any
  // specific vehicle (that was the bug this whole PR exists to fix).
  if (intents.includes('new_car_question')) {
    return `${greeting}不好意思我們是中古車商，只賣精選二手車喔！想看哪種車款或預算範圍可以告訴我～`;
  }

  // === Priority 4: Intent-based replies (no specific vehicle) ===

  // Greeting
  if (/你好|哈囉|嗨|hi|hello|安安/i.test(lower)) {
    return `${greeting}你好！歡迎來到崑家汽車！我是高雄阿家，在高雄車界40年了，請問${greeting}今天想看什麼車款呢？還是有什麼我可以幫忙的？`;
  }

  // Trade-in / old-car estimation — standard template requested by Jerry.
  // Updated 2026-04-24 with new 3-question intake script.
  // Must come BEFORE the appointment branch so "舊車想換" doesn't accidentally
  // match /換/ and get treated as a visit.
  if (/我有一台舊車|舊車想換|舊車.*換新|換車.*估|估價.*舊車|舊車.*估價|折讓|我的車.*換|目前開.*換|現在開.*換|以舊換新|車換車|想換車|要換車|想估車|要估車|收車|估個價|估一下|估價|想賣車|要賣車/.test(userMessage)) {
    return `🤍 ${greeting} 您好，謝謝您的訊息！

要評估收車或車換車，我們需要先了解一下車況。麻煩請提供以下資訊：

1. 請問有請別間車行估過了嗎？
   無 / 價格 _____

2. 請提供車品牌、型號、顏色、公里數

3. 是否有任何鈑件零件更換？

不好意思需要了解比較全面，確保雙方權益。我們一直都以「誠信」為原則在做每一筆生意。
我們會盡快回覆可以收購的價錢！
（收車還是會以看到實車為主）`;
  }

  // Viewing/appointment intent
  if (intents.includes("visit") || /看車|試駕|預約|賞車|過去看|去你們那/.test(lower)) {
    return buildAppointmentReply(greeting, customerContact);
  }

  // Address/location
  if (/地址|在哪|怎麼走|怎麼去|位置|地點/.test(lower)) {
    return `${greeting}崑家汽車在${STORE_ADDRESS}，營業時間${STORE_HOURS}，直接來就好，有任何問題可以先打電話 ${STORE_PHONE} 問賴先生！`;
  }

  // Business hours
  if (/營業時間|幾點開|幾點關|開到幾點|週末有開/.test(lower)) {
    return `${greeting}崑家汽車營業時間是${STORE_HOURS}，想哪個時間來看車呢？直接打 ${STORE_PHONE} 賴先生預約最快！`;
  }

  // Contact request
  if (/電話|手機|聯絡|怎麼聯繫/.test(lower)) {
    return `${greeting}崑家汽車賴先生電話 ${STORE_PHONE}，LINE ${LINE_ID}，地址${STORE_ADDRESS}，直接打電話或加LINE都可以！`;
  }

  // Price negotiation intent — Jerry's 2-step script (2026-04-24).
  // Step 2 trigger: customer already gave a target price (NT$ amount) OR
  // explicitly said something like "出價 X" / "X 萬" / "我出 X". In rule-based
  // we approximate "second-time-ish" by detecting an explicit number in the
  // negotiation message — those are responses to step 1's "有理想的出價嗎".
  if (
    intents.includes("price_negotiation") ||
    /殺價|議價|便宜一點|算便宜|打折|折扣|優惠|最低|底價|能不能.*便宜|可以.*便宜|再少|降價/.test(lower)
  ) {
    const customerProposedPrice = /\d+\s*萬|nt\$|出價|我出|出到|可以.{0,2}\d+/.test(lower);
    if (customerProposedPrice) {
      // Step 2: customer named a number — pivot to in-store visit, never agree on LINE.
      return `${greeting}比較希望您先來店一趟看完車再來詳談價錢的事，買車就是多看多比沒關係的☺️`;
    }
    // Step 1: solicit target price, throw the ball back to the customer.
    return `${greeting}這裡可以盡量幫您爭取，或您有理想的出價嗎？`;
  }

  // Loan intent — always redirect to loan form, never answer directly
  if (intents.includes("loan") || /貸款|分期|月付|頭期|零利率|利率|車貸|信貸|全額|付款方式/.test(lower)) {
    const loanBaseUrl = process.env.BASE_URL || "https://claude-code-remote-production.up.railway.app";
    const vehicleName = detection.vehicle ? `${detection.vehicle.brand} ${detection.vehicle.model}` : '';
    let loanUrl = `${loanBaseUrl}/loan-inquiry`;
    if (detection.vehicle) {
      loanUrl += `?vehicleId=${detection.vehicle.id}&vehicle=${encodeURIComponent(vehicleName)}`;
    }
    const vehiclePrefix = vehicleName ? `${vehicleName}是台好車！` : '';
    return `${greeting}${vehiclePrefix}貸款的部分麻煩你點這個連結填一下資料，專人會盡快跟你聯繫！👉 ${loanUrl}`;
  }

  // Price/budget related (no specific vehicle)
  if (intents.includes("budget") || /預算|多少錢|價格|幾萬/.test(lower)) {
    // Gate: if budget is already known, skip the question and move to brand/body type
    if (ctx.customerBudget || ctx.customerBudgetRange) {
      const wan = ctx.customerBudget ? Math.round(ctx.customerBudget / 100000) : ctx.customerBudgetRange;
      return `${greeting}根據你的預算${wan}萬，我幫你看看有什麼適合的車款！請問有偏好的品牌嗎？`;
    }
    return `${greeting}請問你的預算大概在多少呢？這樣我比較好幫你推薦適合的車款，或者告訴我想找什麼品牌、用途是通勤還是家庭用車，我能更精準推薦！`;
  }

  // "想看車" generic
  if (/想看車|想買車|有什麼車|推薦/.test(lower)) {
    // Build contextual reply based on known preferences
    const parts: string[] = [greeting];
    if (ctx.customerBudget || ctx.customerBudgetRange) {
      const wan = ctx.customerBudget ? Math.round(ctx.customerBudget / 100000) : ctx.customerBudgetRange;
      parts.push(`根據你的預算${wan}萬`);
    }
    if (ctx.customerPreferredBrand) {
      parts.push(`喜歡${ctx.customerPreferredBrand}`);
    }

    // If we know multiple preferences, suggest filtering by remaining unknowns
    const knownCount = (ctx.customerBudget ? 1 : 0) + (ctx.customerPreferredBrand ? 1 : 0) + (ctx.customerPreferredBodyType ? 1 : 0);
    if (knownCount >= 2) {
      return `${parts.join('、')}，我幫你精選最適合的車款！也可以直接來店裡看實車，地址${STORE_ADDRESS}`;
    }

    // Default: ask for missing info
    const ask: string[] = [];
    if (!ctx.customerBudget && !ctx.customerBudgetRange) ask.push('預算範圍');
    if (!ctx.customerPreferredBrand) ask.push('品牌');
    if (!ctx.customerPreferredBodyType) ask.push('車型');

    return `${greeting}歡迎！${ask.length > 0 ? `請問${ask.join('、')}呢？` : ''}告訴我詳細需求我幫你推薦最適合的！也可以直接來店裡看實車，地址${STORE_ADDRESS}`;
  }

  // Fragmented signals (year / budget number / cc)
  if (/^\d{4}$/.test(userMessage.trim())) {
    return `${greeting}你說的 ${userMessage.trim()} 是指年份嗎？請問是想找 ${userMessage.trim()} 年的車呢？還是其他意思？`;
  }
  if (/^\d{2,3}(\.?\d)?萬?$/.test(userMessage.trim())) {
    return `${greeting}預算 ${userMessage.trim()}${userMessage.includes("萬") ? "" : "萬"}左右是嗎？好的我幫你看看有什麼適合的車！請問有偏好的品牌嗎？`;
  }
  if (/^\d{3,4}\s*(cc)?$/i.test(userMessage.trim())) {
    return `${greeting}你想找 ${userMessage.trim().replace(/cc/i, "")}cc 左右的車嗎？請問有偏好的品牌或車型嗎？`;
  }

  // Thank you
  if (/謝謝|感謝|多謝|thanks|thank you/i.test(lower)) {
    return `不客氣！${greeting}有任何問題隨時問我，歡迎來店裡看車，地址${STORE_ADDRESS}，賴先生 ${STORE_PHONE} 隨時為你服務！`;
  }

  // Default fallback
  return `${greeting}你好！感謝你的訊息，如果想了解車輛或預約看車歡迎直接告訴我，或撥打 ${STORE_PHONE} 聯繫賴先生，地址${STORE_ADDRESS}，營業時間${STORE_HOURS}`;
}

// === Builder helpers ===

function buildVehicleInquiryReply(vehicle: any, greeting: string, customerContact: string | null): string {
  // Style: 一段話、不分段不換行、不用句點、80字以內
  const v = vehicle;
  const specs = [
    v.modelYear ? `${v.modelYear}年` : '',
    v.displacement || '',
  ].filter(Boolean).join('');
  const price = formatVehiclePriceSafe(v);
  return `${greeting}你對這台${v.brand} ${v.model}有興趣眼光不錯喔！這台是${specs}售價${price}，想了解車況細節、預約看車試駕還是貸款方案呢`;
}

export function buildVehicleAnswerReply(detection: RuleContext["detection"], greeting: string): string {
  const v = detection.vehicle;
  if (!v) return "";

  // Direct answer from vehicle data (PRIORITY — always answer the question first)
  if (detection.directAnswer) {
    // If there's also a term explanation (customer asked "什麼意思"), append it
    const extra = detection.termExplanation ? `，${detection.termExplanation}` : '';
    return `${greeting}${detection.directAnswer}${extra}，還有其他問題嗎？歡迎隨時問！`;
  }

  // Term explanation only (customer asked "什麼意思" but no direct answer available)
  if (detection.termExplanation) {
    return `${greeting}${detection.termExplanation}，還有什麼想了解的嗎？`;
  }

  // Question type specific
  const q = detection.questionType;
  const name = `${v.brand} ${v.model}`;

  switch (q) {
    case "price":
      return `${greeting}${name} 售價是 ${formatVehiclePriceSafe(v)}！想了解更多或預約看車歡迎告訴我！`;
    case "displacement":
      return `${greeting}${name} 的排氣量是 ${v.displacement || "請來電詢問"}，還想知道什麼嗎？`;
    case "mileage":
      return `${greeting}${name} 的里程是 ${v.mileage || "請來電確認最新里程"}，還有什麼想了解的嗎？`;
    case "year":
      return `${greeting}${name} 是 ${v.modelYear} 年的車，還有什麼想了解的嗎？`;
    case "color":
      return `${greeting}${name} 的顏色是 ${v.color || "請來電確認"}，還有什麼想了解的嗎？`;
    case "transmission":
      return `${greeting}${name} 是 ${v.transmission || "請來電詢問"}，還有什麼想了解的嗎？`;
    case "fuel":
      return `${greeting}${name} 的燃料類型是 ${v.fuelType || "請來電詢問"}，還有什麼想了解的嗎？`;
    case "features":
      return `${greeting}${name} 的配備是${v.features || "詳細配備歡迎來店看車確認"}，要不要來店裡親自體驗？`;
    case "availability":
      return `${greeting}${name} 目前還在喔！要不要預約來看車呢？賴先生 ${STORE_PHONE}`;
    case "photos":
      return `${greeting}想看 ${name} 的照片嗎？歡迎到我們的網站看完整照片，或者直接來店裡看實車最準確！地址${STORE_ADDRESS}`;
    default:
      return `${greeting}${name} ${buildSpecsText(v)}，還有什麼想了解的嗎？`;
  }
}

function buildVehicleGeneralReply(vehicle: any, greeting: string, customerContact: string | null): string {
  const v = vehicle;
  const specs = [v.modelYear ? `${v.modelYear}年` : '', v.displacement || '', v.mileage ? `里程${v.mileage}` : ''].filter(Boolean).join('、');
  const price = formatVehiclePriceSafe(v);
  const phonePrompt = customerContact ? '要不要預約來看實車呢？' : '方便留個電話嗎？賴先生可以直接跟你詳細介紹！';
  return `${greeting}${v.brand} ${v.model}（${specs}）售價${price}是台好車！${phonePrompt}`;
}

function buildAppointmentReply(greeting: string, customerContact: string | null, preferredVisitTime?: string | null): string {
  const phonePart = customerContact
    ? '你的電話我們有了，賴先生會跟你聯繫確認細節！'
    : '方便留個電話嗎？賴先生直接打給你確認比較快！';

  // Gate: if visit time is already known, use it instead of asking
  if (preferredVisitTime) {
    return `${greeting}好的，我幫你安排${preferredVisitTime}來看車！${phonePart}，地址${STORE_ADDRESS}`;
  }

  return `${greeting}想來看車太好了！請問哪個時段方便呢？上午10-11、下午14-15、還是晚上18-19？${phonePart}，地址${STORE_ADDRESS}`;
}

function buildSpecsText(v: any): string {
  const parts = [
    `${v.brand} ${v.model}`,
    `售價${formatVehiclePriceSafe(v)}`,
    `${v.modelYear}年`,
    v.color ? `${v.color}` : "",
    v.mileage ? `里程${v.mileage}` : "",
    v.displacement ? `排氣量${v.displacement}` : "",
    v.transmission ? `${v.transmission}` : "",
    v.fuelType ? `${v.fuelType}` : "",
  ].filter(Boolean);
  return parts.join("、");
}
