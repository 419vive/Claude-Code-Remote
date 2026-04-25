/**
 * 崑家汽車 — 車輛偵測服務模組
 * 
 * Chain of Verification v4: 解決 AI 忽略客人指定車款的問題
 * 
 * 根本原因：targetVehiclePrompt 被埋在巨大的 system prompt 中間，
 * LLM 因為 "lost in the middle" 效應而忽略了車輛指定指令。
 * 
 * 修正策略：
 * 1. 將 targetVehiclePrompt 移到 system prompt 的最末尾（利用 recency bias）
 * 2. 偵測到指定車款時，vehicleKB 只顯示該車的完整資料 + 其他車的簡短列表
 * 3. 加入 case-insensitive 匹配 + 中文品牌別名
 * 4. 加入明確的 Q&A 映射（客人問 cc 數 → 回答排氣量）
 */

import { SHOP_ADDRESS, SHOP_MAP_URL, SHOP_PHONE, SHOP_CONTACT_PERSON, SHOP_HOURS } from "../shared/shopConfig";

// ============ BRAND ALIASES (Chinese → English) ============

export const BRAND_ALIASES: Record<string, string> = {
  // Japanese brands
  '豐田': 'Toyota',
  '本田': 'Honda',
  '日產': 'Nissan',
  '馬自達': 'Mazda',
  '三菱': 'Mitsubishi',
  '鈴木': 'Suzuki',
  '速霸陸': 'Subaru',
  // German brands
  '寶馬': 'BMW',
  '賓士': 'Mercedes-Benz',
  '奧迪': 'Audi',
  '福斯': 'Volkswagen',
  '保時捷': 'Porsche',
  // Korean brands
  '現代': 'Hyundai',
  '起亞': 'Kia',
  // American brands
  '福特': 'Ford',
  '雪佛蘭': 'Chevrolet',
  // Common abbreviations
  'VW': 'Volkswagen',
  'Benz': 'Mercedes-Benz',
};

// ============ QUESTION TYPE DETECTION ============

export type QuestionType = 
  | 'displacement' // cc數、排氣量
  | 'price' // 多少錢、價格
  | 'mileage' // 里程
  | 'transmission' // 變速箱
  | 'fuel' // 油耗、燃料
  | 'features' // 配備
  | 'color' // 顏色
  | 'year' // 年份
  | 'general' // 一般詢問
  | 'availability' // 還在嗎
  | 'photos' // 照片
  | 'explanation' // 什麼意思、是什麼、解釋
  ;

export function detectQuestionType(message: string): QuestionType {
  const lower = message.toLowerCase();
  
  // PRIORITY: Check for "explanation" type first — "什麼意思", "是什麼", "代表什麼"
  // This catches questions like "1.5L 什麼意思" or "cc 是什麼"
  if (/什麼意思|是什麼|代表什麼|代表啥|啥意思|解釋一下|解釋|是啥|什麼東西|什麼概念/.test(lower)) {
    // Determine WHAT they're asking about to provide the right explanation
    // IMPORTANT: Check features BEFORE displacement to avoid 'acc' matching 'cc' in displacement regex
    if (/tss|sensing|安全|氣囊|\babs\b|\besp\b|\bacc\b|adas|雷達|影像/.test(lower)) return 'features';
    if (/\d+\.?\d*\s*l|\bcc\b|cc數|cc 數|排氣|引擎|動力|馬力|渦輪|turbo|自然進氣|\bna\b/.test(lower)) return 'displacement';
    if (/手排|自排|cvt|dct|\bat\b|\bmt\b|變速|幾速/.test(lower)) return 'transmission';
    if (/油耗|省油|柴油|汽油|油電|hybrid|電動|\bev\b/.test(lower)) return 'fuel';
    if (/里程|公里/.test(lower)) return 'mileage';
    // Generic explanation — still mark as explanation type
    return 'explanation';
  }
  
  if (/cc數|cc 數|排氣量|排氣|幾cc|幾 cc|引擎|馬力|動力|\d+\.?\d*\s*l/.test(lower)) return 'displacement';
  if (/多少錢|價錢|價格|價位|售價|報價|幾萬|便宜/.test(lower)) return 'price';
  if (/里程|跑多少|公里數|幾公里|多少公里/.test(lower)) return 'mileage';
  if (/變速箱|手排|自排|手自排|幾速|CVT/.test(lower)) return 'transmission';
  if (/油耗|省油|耗油|燃料|汽油|柴油|油電|電動/.test(lower)) return 'fuel';
  if (/配備|安全|氣囊|倒車|雷達|影像|天窗|皮椅|導航|carplay|apple|android/.test(lower)) return 'features';
  if (/顏色|什麼色|白色|黑色|銀色|灰色|紅色|藍色/.test(lower)) return 'color';
  if (/年份|幾年|出廠/.test(lower)) return 'year';
  if (/還在嗎|還有嗎|賣掉了嗎|有沒有/.test(lower)) return 'availability';
  if (/照片|圖片|看看|外觀|內裝/.test(lower)) return 'photos';
  return 'general';
}

// ============ CAR TERM GLOSSARY (for explanation questions) ============

export const CAR_TERM_GLOSSARY: Record<string, string> = {
  // Displacement / Engine
  '1.0l': '1.0L 代表引擎排氣量是 1000cc，屬於小排量引擎，省油省稅金，市區代步很夠用',
  '1.2l': '1.2L 代表引擎排氣量是 1200cc，小排量但有些配渦輪增壓，動力不錯又省油',
  '1.4l': '1.4L 代表引擎排氣量是 1400cc，配渦輪增壓的話動力等於 2.0 自然進氣，很夠力',
  '1.5l': '1.5L 代表引擎排氣量是 1500cc，是台灣最常見的排氣量，動力跟油耗取得很好的平衡，市區跑高速都很順',
  '1.8l': '1.8L 代表引擎排氣量是 1800cc，動力比 1.5L 更充沛，超車爬坡更輕鬆',
  '2.0l': '2.0L 代表引擎排氣量是 2000cc，動力充沛，高速巡航很穩，適合常跑長途或需要載重的人',
  '2.5l': '2.5L 代表引擎排氣量是 2500cc，大排量動力很猛，適合大車或性能取向',
  '3.0l': '3.0L 代表引擎排氣量是 3000cc，大馬力引擎，加速感很強勁',
  // Transmission
  '自排': '自排就是自動排檔，不用踩離合器換檔，開起來很輕鬆，現在 95% 的車都是自排',
  '手排': '手排需要自己踩離合器換檔，比較有駕駛樂趣，但塞車會比較累',
  'cvt': 'CVT 是無段變速箱，換檔非常平順沒有頓挫感，而且很省油',
  // Fuel
  '柴油': '柴油引擎扭力大、省油，適合常跑高速或需要拖重的人，但保養費用稍高一點',
  '油電': '油電混合動力，有汽油引擎加電動馬達，市區超省油，等紅燈時引擎會自動關閉',
  'hybrid': '油電混合動力，有汽油引擎加電動馬達，市區超省油，等紅燈時引擎會自動關閉',
  // Safety
  'tss': 'TSS 是 Toyota Safety Sense，豐田的主動安全系統，包含車道偏離警示、前方碰撞預警、自動跟車等功能',
  'honda sensing': 'Honda Sensing 是本田的主動安全系統，包含碰撞緩解煞車、車道維持、自動跟車等功能',
  'acc': 'ACC 是主動式定速巡航，車子會自動跟前車保持距離，高速公路開起來超輕鬆',
  // Body type
  'suv': 'SUV 是運動休旅車，底盤比較高，空間大，適合家庭出遊或需要載東西的人',
  'mpv': 'MPV 是多功能休旅車，通常有 7 人座，空間超大，全家出遊最方便',
  'sedan': 'Sedan 是轎車，開起來比較穩比較舒適，行李箱獨立空間也比較安全',
};

/**
 * Get explanation for a car term mentioned in the message.
 * IMPORTANT: Only triggers when customer explicitly asks "什麼意思" / "是什麼" type questions.
 * Otherwise returns '' to avoid overriding the correct answer (e.g., price answer overridden by term glossary).
 */
export function getTermExplanation(message: string, vehicle: any): string {
  const lower = message.toLowerCase();

  // Guard: Only provide term explanations when customer is asking "what does X mean?"
  // Without this guard, glossary terms like "自排" could match inside unrelated messages
  const isAskingExplanation = /什麼意思|是什麼|代表什麼|代表啥|啥意思|解釋|是啥|什麼東西|什麼概念/.test(lower);
  if (!isAskingExplanation) return '';

  // Try to find specific displacement value like "1.5L", "2.0L"
  const displacementMatch = lower.match(/(\d+\.?\d*)\s*l/);
  if (displacementMatch) {
    const key = displacementMatch[1] + 'l';
    const explanation = CAR_TERM_GLOSSARY[key];
    if (explanation) return explanation;
  }

  // Check for other terms in the glossary
  for (const [term, explanation] of Object.entries(CAR_TERM_GLOSSARY)) {
    if (lower.includes(term.toLowerCase())) {
      return explanation;
    }
  }

  // If customer asks "什麼意思" but no specific term found, explain the vehicle's displacement
  if (vehicle?.displacement) {
    const vDisp = vehicle.displacement.toLowerCase().replace(/\s/g, '');
    if (CAR_TERM_GLOSSARY[vDisp]) {
      return CAR_TERM_GLOSSARY[vDisp];
    }
  }

  return '';
}

export function getQuestionAnswer(vehicle: any, questionType: QuestionType): string {
  switch (questionType) {
    case 'displacement':
      return vehicle.displacement 
        ? `排氣量是 ${vehicle.displacement}` 
        : '排氣量這個資訊目前沒有，歡迎來電詢問';
    case 'price':
      return `售價 ${vehicle.priceDisplay || vehicle.price + '萬'}`;
    case 'mileage':
      return vehicle.mileage 
        ? `里程 ${vehicle.mileage}` 
        : '里程數這個資訊目前沒有，歡迎來電詢問';
    case 'transmission':
      return vehicle.transmission 
        ? `變速箱是 ${vehicle.transmission}` 
        : '變速箱這個資訊目前沒有，歡迎來電詢問';
    case 'fuel':
      return vehicle.fuelType 
        ? `燃料類型是 ${vehicle.fuelType}` 
        : '燃料這個資訊目前沒有，歡迎來電詢問';
    case 'features':
      return vehicle.features 
        ? `配備包含：${vehicle.features}` 
        : '配備這個資訊目前沒有，歡迎來電詢問';
    case 'color':
      return vehicle.color 
        ? `顏色是 ${vehicle.color}` 
        : '顏色這個資訊目前沒有，歡迎來電詢問';
    case 'year':
      return vehicle.modelYear 
        ? `${vehicle.modelYear}年份` 
        : '年份這個資訊目前沒有，歡迎來電詢問';
    case 'availability':
      return '目前還在喔！';
    case 'photos':
      return '想看這台車的照片嗎？點下方「看所有照片」按鈕可以看完整照片，也歡迎直接來店裡看實車！';
    case 'explanation':
      return ''; // Explanation answers are handled by getTermExplanation
    default:
      return '';
  }
}

// ============ VEHICLE DETECTION ============

export interface DetectionResult {
  type: 'inquiry_button' | 'mentioned' | 'context' | 'context_missing' | 'fallback' | 'none';
  vehicle: any | null;
  questionType: QuestionType;
  directAnswer: string;
  termExplanation: string; // Explanation for car terms (e.g., "1.5L 代表...")
}

/**
 * Pre-built search index for fast vehicle lookups.
 * Avoids repeated O(N) scans with .find() during detection.
 */
export interface VehicleIndex {
  byBrandModel: Map<string, any>;     // "BRAND|MODEL" → vehicle
  byModel: Map<string, any>;          // "MODEL" → vehicle (first match)
  byBrand: Map<string, any[]>;        // "BRAND" → [vehicles]
  all: any[];
}

export function buildVehicleIndex(vehicles: any[]): VehicleIndex {
  const byBrandModel = new Map<string, any>();
  const byModel = new Map<string, any>();
  const byBrand = new Map<string, any[]>();

  for (const v of vehicles) {
    const brandUpper = v.brand.toUpperCase();
    const modelUpper = v.model.toUpperCase();
    byBrandModel.set(`${brandUpper}|${modelUpper}`, v);
    if (modelUpper.length >= 2 && !byModel.has(modelUpper)) {
      byModel.set(modelUpper, v);
    }
    // Also index by base model name (first word of model) for short messages like "BMW X1"
    // e.g. "X1 sDrive20i" → also index "X1", "Corolla Cross GR Sport" → also index "Corolla Cross"
    const modelWords = modelUpper.split(/\s+/);
    for (let len = 1; len <= Math.min(modelWords.length - 1, 2); len++) {
      const baseModel = modelWords.slice(0, len).join(' ');
      if (baseModel.length >= 2 && !byModel.has(baseModel)) {
        byModel.set(baseModel, v);
      }
      // Also index brand+baseModel
      const bmKey = `${brandUpper}|${baseModel}`;
      if (!byBrandModel.has(bmKey)) {
        byBrandModel.set(bmKey, v);
      }
    }
    const arr = byBrand.get(brandUpper) || [];
    arr.push(v);
    byBrand.set(brandUpper, arr);
  }

  return { byBrandModel, byModel, byBrand, all: vehicles };
}

/**
 * Normalize message for matching: expand aliases, handle case-insensitivity
 */
function normalizeForMatching(message: string): string {
  let normalized = message;
  // Replace Chinese brand names with English equivalents
  for (const [alias, brand] of Object.entries(BRAND_ALIASES)) {
    normalized = normalized.replace(new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), brand);
  }
  return normalized;
}

/**
 * Fast indexed lookup: find vehicle by checking brand+model, model-only, or brand-only.
 */
function findVehicleFromNormalized(normalizedUpper: string, index: VehicleIndex, userMessage: string): any | null {
  // Layer 1: brand + model (exact pair in message)
  // Layer 1: brand + model — prefer LONGEST match (most specific)
  let found: any | null = null;
  let foundKeyLen = 0;
  index.byBrandModel.forEach((v, key) => {
    const [brand, model] = key.split("|");
    if (normalizedUpper.includes(brand) && normalizedUpper.includes(model)) {
      if (key.length > foundKeyLen) { found = v; foundKeyLen = key.length; }
    }
  });
  if (found) return found;

  // Layer 2: model only — prefer LONGEST match
  let foundModelLen = 0;
  index.byModel.forEach((v, model) => {
    if (normalizedUpper.includes(model)) {
      if (model.length > foundModelLen) { found = v; foundModelLen = model.length; }
    }
  });
  if (found) return found;

  // Layer 3: brand + car keywords
  const carKeywords = /車|多少|價格|cc|排氣|配備|里程|油耗|還在|照片|看看|那台|這台|那個|這個|來看|去看|想看|要看|看車|預約|時間|方便|地址|在哪|店裡|店面|試駕|買|要買|想買|要|想要|嗜|感興趣|有興趣|下訂|訂車/;
  if (carKeywords.test(userMessage)) {
    index.byBrand.forEach((vehicles, brand) => {
      if (found) return;
      if (normalizedUpper.includes(brand) && vehicles.length > 0) found = vehicles[0];
    });
    if (found) return found;
  }

  // Layer 4: brand only if exactly one vehicle of that brand
  index.byBrand.forEach((vehicles, brand) => {
    if (found) return;
    if (normalizedUpper.includes(brand) && vehicles.length === 1) found = vehicles[0];
  });
  return found;
}

// ============ CONTEXT-AWARE DETECTION (Conversation History) ============

/**
 * Patterns that indicate the user is referring to a previously mentioned vehicle.
 * e.g., "那排氣量呢", "這台多少錢", "它的里程", "那個有什麼配備"
 */
export const CONTEXT_REFERENCE_PATTERNS = /^(那|這台|那台|這個|那個|它的?|上面那台|剛剛那台|前面那台|同一台)/;
const FOLLOW_UP_PATTERNS = /^(那|所以|然後|還有|另外|對了|請問|想問|想知道|好奇|順便問)/;
const ACKNOWLEDGMENT_PATTERNS = /^(好|嗯|ok|OK|對|是|好的|好啊|好喔|沒問題|可以|行|嗯嗯|👍|🙏|了解|知道了|收到|okok)$/;

/**
 * Check if the current message is a follow-up question about a previously discussed vehicle.
 * Returns true if the message has a question type but no explicit vehicle mention.
 */
function isFollowUpQuestion(message: string, questionType: QuestionType): boolean {
  const lower = message.trim().toLowerCase();

  // Acknowledgments always carry context from previous message
  if (ACKNOWLEDGMENT_PATTERNS.test(lower)) return true;

  // General type without explicit context reference is NOT a follow-up
  if (questionType === 'general') {
    // Exception: explicit context references like "那台怎樣"
    if (CONTEXT_REFERENCE_PATTERNS.test(lower)) return true;
    return false;
  }

  // Explicit context references: "那台", "這台", "它的"
  if (CONTEXT_REFERENCE_PATTERNS.test(lower)) return true;

  // Follow-up starters + question type: "那排氣量呢", "所以多少錢"
  if (FOLLOW_UP_PATTERNS.test(lower)) return true;

  // Short messages with only a question (no vehicle name) are likely follow-ups
  // e.g., "排氣量呢", "多少錢", "有什麼配備"
  // But not TOO loose — require at least a question-like word
  if (message.length <= 10) return true;

  return false;
}

/**
 * Extract the most recently discussed vehicle from conversation history.
 * Scans messages from newest to oldest, looking for vehicle mentions.
 */
export function extractVehicleFromHistory(
  conversationHistory: Array<{ role: string; content: string }>,
  allVehicles: any[]
): any | null {
  if (!conversationHistory || conversationHistory.length === 0) return null;

  // Helper to find vehicle in a message
  const findInMessage = (content: string): any | null => {
    const normalized = normalizeForMatching(content);
    const normalizedUpper = normalized.toUpperCase();

    // Try brand + model
    const found = allVehicles.find(v => {
      const brandUpper = v.brand.toUpperCase();
      const modelUpper = v.model.toUpperCase();
      return normalizedUpper.includes(brandUpper) && normalizedUpper.includes(modelUpper);
    });
    if (found) return found;

    // Try model only (min 2 chars)
    const foundModel = allVehicles.find(v => {
      const modelUpper = v.model.toUpperCase();
      return modelUpper.length >= 2 && normalizedUpper.includes(modelUpper);
    });
    if (foundModel) return foundModel;

    // Try "我想詢問這台車" button format (same regex as main detection)
    const inquiryMatch = content.match(/我想詢問這台車[：:][\s\S]*?([A-Za-z][\w\s-]+?)\s+(\d{4})年/);
    if (inquiryMatch) {
      const [, nameStr, yearStr] = inquiryMatch;
      return matchVehicleByName(nameStr, allVehicles, yearStr);
    }

    return null;
  };

  // Two-pass strategy to prevent context bleed:
  // Pass 1: Only search USER messages (most reliable — user explicitly mentioned a vehicle)
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const msg = conversationHistory[i];
    if (msg.role !== 'user') continue;
    const found = findInMessage(msg.content || '');
    if (found) {
      console.log(`[VehicleDetection] extractVehicleFromHistory: found ${found.brand} ${found.model} in user message at index ${i}`);
      return found;
    }
  }
  // Pass 2: If no user message has a vehicle, check assistant messages (fallback)
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const msg = conversationHistory[i];
    if (msg.role !== 'assistant') continue;
    const found = findInMessage(msg.content || '');
    if (found) {
      console.log(`[VehicleDetection] extractVehicleFromHistory: found ${found.brand} ${found.model} in assistant message at index ${i} (fallback)`);
      return found;
    }
  }

  return null;
}

/**
 * Find a vehicle from the message using multi-layer detection.
 * Now with context awareness: if no vehicle found in current message,
 * check conversation history for the most recently discussed vehicle.
 *
 * Pass an optional `vehicleIndex` (from `buildVehicleIndex`) to skip
 * repeated O(N) scans. Falls back to linear search if index not provided.
 */
/**
 * Shared helper: match a vehicle by name string with 3-tier fallback.
 * 1. Year + name (if yearStr provided)
 * 2. Brand AND model (strict)
 * 3. Brand OR model (loose)
 */
function matchVehicleByName(nameStr: string, allVehicles: any[], yearStr?: string): any | null {
  const nameUpper = nameStr.toUpperCase();

  // Tier 1: year + name
  if (yearStr) {
    const byYear = allVehicles.find(v => {
      const nameMatch = nameStr.includes(v.brand) || nameStr.includes(v.model) || `${v.brand} ${v.model}`.includes(nameStr);
      return nameMatch && String(v.modelYear) === yearStr;
    });
    if (byYear) return byYear;
  }

  // Tier 2: brand AND model
  const strict = allVehicles.find(v =>
    nameUpper.includes(v.brand.toUpperCase()) && nameUpper.includes(v.model.toUpperCase())
  );
  if (strict) return strict;

  // Tier 3: brand only (if exactly one vehicle of that brand — avoids false positives)
  for (const v of allVehicles) {
    if (nameUpper.includes(v.brand.toUpperCase())) {
      const sameBrand = allVehicles.filter(o => o.brand.toUpperCase() === v.brand.toUpperCase());
      if (sameBrand.length === 1) return sameBrand[0];
    }
  }
  return null;
}

export function detectVehicleFromMessage(
  userMessage: string,
  allVehicles: any[],
  conversationHistory?: Array<{ role: string; content: string }>,
  vehicleIndex?: VehicleIndex
): DetectionResult {
  const questionType = detectQuestionType(userMessage);
  const normalized = normalizeForMatching(userMessage);
  const normalizedUpper = normalized.toUpperCase();

  // ============ Layer 1: "我想詢問這台車" button format ============
  // NOTE: Button text contains specs like "1.7L" which would pollute questionType.
  // Force questionType to 'general' for inquiry buttons — the customer is inquiring, not asking a specific question.
  //
  // Two regex variants:
  // 1. Full format with price: "我想詢問這台車：BMW X1 2014年\n售價：37.8 萬"
  // 2. Short format without price: "我想詢問這台車：BMW X1 2014年" (from photo carousel tap)
  // 3. No-price format: price is "面議"/"電洽" (non-numeric)
  // Note: price group is non-capturing — we only need name + year for matching
  const inquiryFullMatch = userMessage.match(/我想詢問這台車[：:][\s\S]*?([A-Za-z][\w\s-]+?)\s+(\d{4})年[\s\S]*?售價[：:]\s*[\d.\s]+萬/);
  const inquiryShortMatch = !inquiryFullMatch && userMessage.match(/我想詢問這台車[：:][\s\S]*?([A-Za-z][\w\s-]+?)\s+(\d{4})年/);
  const inquiryMatch = inquiryFullMatch || inquiryShortMatch;
  if (inquiryMatch) {
    const [, nameStr, yearStr] = inquiryMatch;
    const matchedVehicle = matchVehicleByName(nameStr, allVehicles, yearStr);
    return { type: 'inquiry_button', vehicle: matchedVehicle, questionType: 'general', directAnswer: '', termExplanation: '' };
  }

  // ============ Layer 1b: "我想了解 {brand} {model}" button format ============
  // From photo carousel fallback, quick reply buttons, etc.
  const learnMatch = userMessage.match(/^我想了解\s+(.+)$/);
  if (learnMatch) {
    const nameStr = learnMatch[1].trim();
    const matchedVehicle = matchVehicleByName(nameStr, allVehicles);
    if (matchedVehicle) {
      return { type: 'inquiry_button', vehicle: matchedVehicle, questionType: 'general', directAnswer: '', termExplanation: '' };
    }
  }

  // ============ Layer 2: Brand + Model mention (indexed or linear) ============
  let mentionedVehicle: any | null = null;
  if (vehicleIndex) {
    mentionedVehicle = findVehicleFromNormalized(normalizedUpper, vehicleIndex, userMessage);
  } else {
    // Fallback: original linear scan (backward compat)
    mentionedVehicle = allVehicles.find(v => {
      const brandUpper = v.brand.toUpperCase();
      const modelUpper = v.model.toUpperCase();
      return normalizedUpper.includes(brandUpper) && normalizedUpper.includes(modelUpper);
    }) || null;
    if (!mentionedVehicle) {
      mentionedVehicle = allVehicles.find(v => {
        const modelUpper = v.model.toUpperCase();
        return modelUpper.length >= 2 && normalizedUpper.includes(modelUpper);
      }) || null;
    }
    if (!mentionedVehicle) {
      const carKeywords = /車|多少|價格|cc|排氣|配備|里程|油耗|還在|照片|看看|那台|這台|那個|這個|來看|去看|想看|要看|看車|預約|時間|方便|地址|在哪|店裡|店面|試駕|買|要買|想買|要|想要|嗜|感興趣|有興趣|下訂|訂車/;
      if (carKeywords.test(userMessage)) {
        mentionedVehicle = allVehicles.find(v => normalizedUpper.includes(v.brand.toUpperCase())) || null;
      }
    }
    if (!mentionedVehicle) {
      const brandMatch = allVehicles.filter(v => normalizedUpper.includes(v.brand.toUpperCase()));
      if (brandMatch.length === 1) mentionedVehicle = brandMatch[0];
    }
  }

  if (mentionedVehicle) {
    const directAnswer = getQuestionAnswer(mentionedVehicle, questionType);
    const termExplanation = getTermExplanation(userMessage, mentionedVehicle);
    return { type: 'mentioned', vehicle: mentionedVehicle, questionType, directAnswer, termExplanation };
  }

  // ============ Layer 3: Contains "我想詢問這台車" but no match ============
  if (userMessage.includes('我想詢問這台車')) {
    return { type: 'fallback', vehicle: null, questionType, directAnswer: '', termExplanation: '' };
  }

  // ============ Layer 4: Context-aware detection from conversation history ============
  if (conversationHistory && conversationHistory.length > 0) {
    if (isFollowUpQuestion(userMessage, questionType)) {
      const historyVehicle = extractVehicleFromHistory(conversationHistory, allVehicles);
      if (historyVehicle) {
        const directAnswer = getQuestionAnswer(historyVehicle, questionType);
        const termExplanation = getTermExplanation(userMessage, historyVehicle);
        console.log(`[VehicleDetection] Context-aware: resolved "${userMessage}" to ${historyVehicle.brand} ${historyVehicle.model} from conversation history`);
        return { type: 'context', vehicle: historyVehicle, questionType, directAnswer, termExplanation };
      }
      // Follow-up detected but no vehicle in history → special fallback
      // So LLM knows to ask "你問的是哪一台呢？" instead of giving a generic greeting
      console.log(`[VehicleDetection] Follow-up question detected but no vehicle in history: "${userMessage}"`);
      return { type: 'context_missing', vehicle: null, questionType, directAnswer: '', termExplanation: '' };
    }
  }

  return { type: 'none', vehicle: null, questionType, directAnswer: '', termExplanation: '' };
}

// ============ PROMPT BUILDING ============

/**
 * Build the vehicle knowledge base.
 * When a target vehicle is detected, show its FULL details prominently
 * and abbreviate other vehicles to reduce noise.
 */
export function buildSmartVehicleKB(
  allVehicles: any[],
  targetVehicle: any | null
): string {
  if (!allVehicles.length) return '目前沒有在售車輛。';
  
  if (!targetVehicle) {
    // No target vehicle — show all vehicles with full details
    return allVehicles.map(v => {
      const parts = [
        `【${v.brand} ${v.model}】`,
        `售價：${v.priceDisplay || v.price + '萬'}`,
        `年份：${v.modelYear}年`,
        v.color ? `顏色：${v.color}` : '',
        v.mileage ? `里程：${v.mileage}` : '',
        v.displacement ? `排氣量：${v.displacement}` : '',
        v.transmission ? `變速箱：${v.transmission}` : '',
        v.fuelType ? `燃料：${v.fuelType}` : '',
        v.bodyType ? `車型：${v.bodyType}` : '',
        v.features ? `配備：${v.features}` : '',
        v.description ? `描述：${v.description}` : '',
      ].filter(Boolean);
      return parts.join('\n');
    }).join('\n\n---\n\n');
  }
  
  // Target vehicle detected — show it prominently, abbreviate others
  const targetParts = [
    `★★★ 客人詢問的車 ★★★`,
    `【${targetVehicle.brand} ${targetVehicle.model}】`,
    `售價：${targetVehicle.priceDisplay || targetVehicle.price + '萬'}`,
    `年份：${targetVehicle.modelYear}年`,
    targetVehicle.color ? `顏色：${targetVehicle.color}` : '',
    targetVehicle.mileage ? `里程：${targetVehicle.mileage}` : '',
    targetVehicle.displacement ? `排氣量：${targetVehicle.displacement}` : '',
    targetVehicle.transmission ? `變速箱：${targetVehicle.transmission}` : '',
    targetVehicle.fuelType ? `燃料：${targetVehicle.fuelType}` : '',
    targetVehicle.bodyType ? `車型：${targetVehicle.bodyType}` : '',
    targetVehicle.features ? `配備：${targetVehicle.features}` : '',
    targetVehicle.guarantees ? `認證/保障：${targetVehicle.guarantees}` : '',
    targetVehicle.description ? `描述：${targetVehicle.description}` : '',
    targetVehicle.licenseDate ? `出廠日期：${targetVehicle.licenseDate}` : '',
    `★★★★★★★★★★★★★★★`,
  ].filter(Boolean).join('\n');
  
  // Other vehicles — brief one-liner each
  const otherVehicles = allVehicles
    .filter(v => v.id !== targetVehicle.id)
    .map(v => `${v.brand} ${v.model} ${v.modelYear}年 ${v.priceDisplay || v.price + '萬'}`)
    .join('\n');
  
  return `${targetParts}\n\n其他在售車輛（簡列）：\n${otherVehicles}`;
}

/**
 * Build the targetVehiclePrompt that goes at the END of the system prompt.
 * This is the most critical part — it must be the LAST thing the LLM reads
 * to leverage recency bias.
 * 
 * customerContact: pass the customer's phone if already on file, so the AI
 *   knows whether to ask for it or skip.
 */
export function buildTargetVehiclePrompt(
  detection: DetectionResult,
  userMessage: string,
  customerContact?: string | null
): string {
  if (detection.type === 'none') return '';
  
  const v = detection.vehicle;
  const questionType = detection.questionType;
  const directAnswer = detection.directAnswer;
  
  const termExplanation = detection.termExplanation;
  
  if (detection.type === 'inquiry_button' && v) {
    // === HIGH-INTENT INQUIRY ===
    // Customer clicked the inquiry button — intent is crystal clear.
    // Strategy: affirm + 1 highlight + 3 engaging questions for the customer to pick from
    const specs = [
      v.modelYear ? `${v.modelYear}年` : '',
      v.displacement || '',
      v.mileage ? `里程${v.mileage}` : '',
    ].filter(Boolean).join('、');

    const phoneNote = customerContact
      ? `（客人已留電話 ${customerContact}，不用再問）`
      : '';

    return `

## ❗❗❗ 最後指令（最高優先級）❗❗❗

客人點了「詢問這台車」按鈕：【${v.brand} ${v.model}】（${specs}，售價${v.priceDisplay || v.price + '萬'}）
${phoneNote}

你必須按照以下範本回覆（可以微調用詞但結構不變）：

範本：「[稱呼]這台${v.model}（${specs}）${v.priceDisplay || v.price + '萬'}眼光不錯！想了解[面向A]、[面向B]、還是[面向C]呢？🚗」

面向選擇（從以下挑3個最適合的）：
- 車況細節／保養紀錄
- 預約來店看車試駕
- 貸款分期方案
- 實車照片
- 配備亮點
- 跟同級車比較

規則：
- 一段話，不分段不換行，不用句點（。），不用markdown
- 絕對禁止推薦其他車款`;
  }

  if (detection.type === 'inquiry_button' && !v) {
    // Customer clicked inquiry button but the vehicle is not in our DB (e.g. already sold)
    // Extract car info directly from the user's message to acknowledge correctly
    return `

## ❗❗❗ 最後指令（最高優先級）❗❗❗

客人點了「詢問這台車」按鈕，但這台車目前不在我們的庫存中（可能已售出）
客人的原始訊息：「${userMessage}」

回覆規則：
1. 先告訴客人這台車目前已經不在庫存了（可能已售出）
2. 問客人有沒有想找類似的車款，或有什麼其他條件
3. 可以建議看看目前的在售車輛（「看車庫存」）
4. 一段話，不分段不換行，不用句點（。），不用markdown
5. 絕對不要回覆其他車的資訊，除非客人主動問`;
  }

  if (detection.type === 'mentioned' && v) {
    return `

## ❗❗❗ 最後指令（最高優先級）❗❗❗

客人正在問：【${v.brand} ${v.model}】
客人的原始訊息：「${userMessage}」
${directAnswer ? `客人的問題類型：${questionType}，直接答案：${directAnswer}` : ''}
${termExplanation ? `術語解釋（用白話告訴客人）：${termExplanation}` : ''}

車輛資料：售價${v.priceDisplay || v.price + '萬'}、${v.modelYear}年、${v.displacement || ''}、里程${v.mileage || '未標示'}、${v.color || ''}、${v.transmission || ''}

回覆規則：
1. 直接回答客人的問題${directAnswer ? `（${directAnswer}）` : ''}，然後提供3個不同面向讓客人選擇繼續聊
2. 只能用上面有的資料，不能編造
3. 一段話，不分段不換行，不用句點（。），不用markdown
4. 禁止推薦其他車款`;
  }

  if (detection.type === 'context' && v) {
    return `

## ❗❗❗ 最後指令（最高優先級）❗❗❗

客人之前在問【${v.brand} ${v.model}】，現在跟進問了一個問題
客人的原始訊息：「${userMessage}」
${directAnswer ? `客人的問題類型：${questionType}，直接答案：${directAnswer}` : ''}
${termExplanation ? `術語解釋（用白話告訴客人）：${termExplanation}` : ''}

車輛資料：售價${v.priceDisplay || v.price + '萬'}、${v.modelYear}年、${v.displacement || ''}、里程${v.mileage || '未標示'}、${v.color || ''}、${v.transmission || ''}

回覆規則：
1. 如果這個問題之前已經回答過（例如售價已經在車輛卡片或之前的訊息提過），用「誠如剛剛說的，${directAnswer || '...'}」帶過，然後進一步問客人還想了解這台車的什麼資訊
2. 如果是新問題，直接回答${directAnswer ? `（${directAnswer}）` : ''}，然後問客人還想進一步了解什麼
3. 只能用上面有的資料，不能編造
4. 一段話，不分段不換行，不用句點（。），不用markdown
5. 禁止推薦其他車款`;
  }

  if (detection.type === 'context_missing') {
    return `

## ❗❗❗ 最後指令（最高優先級）❗❗❗

客人似乎在問跟進問題，但我們不確定他問的是哪台車
客人的原始訊息：「${userMessage}」

回覆規則：
1. 自然地問客人「你問的是哪一台呢？」或「你想了解哪台車呢？」
2. 可以列出我們目前在售的車款讓客人選
3. 一段話，不分段不換行，不用句點（。），不用markdown
4. 語氣親切自然`;
  }

  if (detection.type === 'fallback') {
    return `

## ❗❗❗ 最後指令（最高優先級，覆蓋所有其他規則）❗❗❗

客人正在詢問特定車輛！
客人的原始訊息：「${userMessage}」

你的回覆規則：
1. 從上方「在售車輛」清單中找到客人詢問的車款
2. 只能用清單中有的資料來介紹，不能編造
3. 引導來店看車或留電話
4. 🚫🚫🚫 絕對禁止推薦其他車款！客人問的就是這台！🚫🚫🚫`;
  }
  
  return '';
}


// ============ INTENT DETECTION + INSTRUCTION INJECTION ============
// 
// Root cause of all "答非所問" issues:
// System prompt is 500+ lines. Rules in the MIDDLE get ignored by LLM ("lost in the middle").
// Solution: Detect customer INTENT from their message, then inject focused instructions
// at the END of the system prompt where LLM pays most attention (recency bias).
//

export type CustomerIntent =
  | 'appointment'       // 預約看車、約時間
  | 'address'           // 問地址、怎麼去
  | 'phone'             // 問電話
  | 'hours'             // 問營業時間
  | 'greeting'          // 打招呼
  | 'price_negotiation' // 議價、殺價
  | 'loan'              // 貸款、分期
  | 'providing_contact' // 客人正在提供電話號碼
  | 'how_to_browse'     // 怎麼看車、怎麼瀏覽
  | 'vehicle_spec'      // 車輛規格（由 vehicleDetection 處理）
  | 'general_browse'    // 一般瀏覽、推薦
  | 'pricing'           // 問價格、多少錢
  | 'new_car_question'  // 客人問「你們賣新車嗎」— 需要澄清我們只賣中古車
  | 'trade_in_inquiry'  // 客人有舊車要估價/換車 — 觸發 3 題收車腳本
  ;

/**
 * Intents that signal a GENERAL BUSINESS question unrelated to any specific
 * vehicle. When any of these fire AND the current message has no vehicle
 * detected, `dynamicPromptBuilder.buildLLMMessages` will clear conversation
 * history before the LLM call — preventing stale vehicle mentions from prior
 * sessions from leaking into the response.
 *
 * Co-located with CustomerIntent so adding a new intent forces a decision
 * about whether it belongs in this set (reviewer m2, 2026-04-23 PM).
 */
export const GENERAL_BUSINESS_INTENTS: ReadonlySet<CustomerIntent> = new Set<CustomerIntent>([
  'hours',
  'address',
  'phone',
  'greeting',
  'how_to_browse',
  'new_car_question',
]);

/**
 * Detect ALL intents from a customer message (can have multiple).
 * This is separate from vehicle detection — it detects WHAT the customer wants to DO.
 */
export function detectCustomerIntents(message: string): CustomerIntent[] {
  const intents: CustomerIntent[] = [];
  const lower = message.toLowerCase();
  
  // Appointment / visit intent
  if (/預約|約[個一]|看車|賞車|試駕|試乘|什麼時候.*方便|什麼時候.*過去|什麼時候.*去|什麼時候.*可以|幾點.*方便|幾點.*可以|明天.*去|明天.*看|後天.*去|後天.*看|禮拜.*去|禮拜.*看|週末.*去|週末.*看|平日.*去|平日.*看|上午.*去|上午.*看|下午.*去|下午.*看|晚上.*去|晚上.*看|想去.*看|想過去|想去你們|去你們那|去你們店|去店裡|到店|過去看|去看/.test(lower)) {
    intents.push('appointment');
  }
  
  // Address intent
  // TESTER-FLAG 2026-04-23: expanded to catch common Taiwanese address phrasings
  // that were leaking through as type='none' (→ no history clear → Toyota leak).
  // Added: 住哪 (colloquial "where do you live/sit"), 地圖 (customer asking for map),
  // GPS/座標 (navigation terms). "路線" stays but note it incidentally matches
  // "新車路線" which is acceptable — misrouting to address still clears stale vehicle
  // context, which is the safer outcome.
  if (/地址|在哪|怎麼走|怎麼去|哪裡|位置|位在|店在|店面在|導航|路線|住哪|地圖|GPS|座標/i.test(lower)) {
    intents.push('address');
  }
  
  // Providing contact intent — customer is GIVING their phone number
  // Must check BEFORE phone intent to avoid conflict
  const hasPhoneNumber = /0\d{8,9}|09\d{8}|\d{2,4}[\s-]\d{3,4}[\s-]\d{3,4}/.test(lower);
  const isProvidingPhone = hasPhoneNumber && /我的|我|電話是|手機是|號碼是|給你|留|打這支|聯繫我|聯絡我|打給我/.test(lower);
  
  if (isProvidingPhone) {
    intents.push('providing_contact');
  }
  
  // Phone intent — customer is ASKING for the store's phone number
  // Only trigger if NOT providing their own number
  if (!isProvidingPhone && /電話|手機|號碼|打給|聯繫|聯絡方式|怎麼聯繫|怎麼聯絡/.test(lower)) {
    intents.push('phone');
  }
  
  // Business hours intent
  // TESTER-FLAG 2026-04-23: added 星期/禮拜 day-name probes. "禮拜X有開嗎" already
  // matched via 有開嗎, but "星期日營業嗎" slipped past (營業時間 requires 時間).
  if (/營業時間|幾點開|幾點關|幾點到幾點|開到幾點|什麼時候開|什麼時候營業|休息|公休|有開嗎|有營業|星期.{0,3}(?:開|營業)|禮拜.{0,3}(?:開|營業)|週.{0,3}(?:開|營業)/.test(lower)) {
    intents.push('hours');
  }
  
  // Greeting intent
  if (/^(你好|哈囉|嗨|hi|hello|hey|早安|午安|晚安|安安|在嗎|請問|不好意思)[\s！!。？?]*$/i.test(lower.trim())) {
    intents.push('greeting');
  }
  
  // Price negotiation intent — extended 2026-04-24 to catch Jerry's specific
  // example phrasings ("可以殺多少", "可以再便宜嗎", "有議價空間嗎").
  if (/殺價|議價|議價空間|便宜一點|算便宜|打折|折扣|優惠|最低|底價|能不能.*便宜|可以.*便宜|可以.*再便宜|再少|降價|殺多少|可以.*殺|有.*空間|有沒有.*空間/.test(lower)) {
    intents.push('price_negotiation');
  }
  
  // Loan intent
  if (/貸款|分期|月付|頭期|零利率|利率|車貸|信貸|全額|付款方式/.test(lower)) {
    intents.push('loan');
  }
  
  // How to browse intent — customer asking how to view cars/photos/inventory
  if (/怎麼看|怎麼瀏覽|在哪看|在哪裡看|哪裡看|如何看|如何瀏覽|怎麼查|怎麼找|看不到|找不到|要怎麼|有什麼車|有哪些車|車子在哪|庫存在哪|哪裡可以看|可以看車|想看車|看一下車|看看車|看你們的車/.test(lower)) {
    intents.push('how_to_browse');
  }

  // Pricing intent — customer asking about price
  if (/多少錢|價格|價位|售價|報價|幾萬|多少萬|什麼價|賣多少/.test(lower)) {
    intents.push('pricing');
  }

  // New-car question intent — customer asking if we sell NEW cars.
  // We only sell 中古車 (used). The bot must clarify WITHOUT talking about
  // any specific vehicle (this was the 2026-04-23 PM "Toyota Corolla Cross
  // GR Sport" hallucination trigger).
  //
  // Guard: exclude "新車主" (new owner) / "新車款" (new model variant) /
  // "新車型" (new type) / "全新車況"/"跟新車一樣"/"新車況"/"新車險" — those are
  // used-car-context phrases and must NOT trigger this intent.
  //
  // TESTER-FLAG 2026-04-23: expanded after QA pass.
  // Tier 1 (direct 新車 mentions that were slipping through):
  //   請問新車、我要新車、新車價格、新車呢、新車的部分、新車路線、新車價、新古車
  // Tier 2 (paraphrases of "new vs used"):
  //   你們是新的還是中古、全新的、有沒有全新、新的一台、不是要中古的我要新的、只賣二手嗎還是新的
  //
  // Strategy:
  //   A. Keep original patterns.
  //   B. Add: 新車 as a bare noun surrounded by particles (的|價|呢|部分|路線) — but
  //      carefully excluding the false-positive stems (新車主|新車款|新車型|新車險|新車況).
  //   C. Add: "全新" / "新的" in new-vs-used contrastive contexts (還是中古|還是二手|vs中古).
  //   D. Add: "新古車" (Taiwanese slang for almost-new used car — customer likely
  //      confused about our inventory type, still warrants the clarification response).
  const newCarCore = /(?:賣|有|有沒有|有賣|提供|出售|進口|主打|走|做)\s*新車|新車(?:嗎|呢|\?|\？|可以|能|會|還是)|(?:要|想|買|訂)\s*新車|新車\s*(?:的話|選擇|的?部分)/;
  // Bare-noun 新車: must NOT be preceded by 主|款|型|險|況 (false-positive stems)
  // AND must NOT be immediately preceded by simile words (像|如|跟|好比|彷彿|猶如|一樣)
  // which produce "像新車一樣" / "跟新車一樣" (used-car-in-great-condition phrasing).
  const newCarBareNoun = /(?<![主款型險況])(?<!像)(?<!如)(?<!跟)(?<!好比)(?<!彷彿)(?<!猶如)新車(?![主款型險況])(?!一樣)/;
  // new-vs-used contrastive + "有/賣 全新" standalone (customer asking "do you have brand-new ones")
  const newVsUsed = /(?:全新|新的).*(?:還是|vs|對|還是要)?.{0,4}(?:中古|二手)|(?:中古|二手).{0,6}(?:還是|或|vs).{0,4}(?:新的|全新|新車)|不是要.{0,4}中古.{0,6}(?:新的|新車|全新)|只賣二手.{0,6}(?:新的|新車)|(?:有|有沒有|賣|出售|提供)\s*全新|全新(?:的車|一台|的一台|車款).*(?:有|嗎)|(?:有|有沒有|賣|出售|提供)\s*新的(?:車|一台|一部)|新的一台(?:多少|有嗎|嗎)/;
  const newGuCar = /新古車/;  // Taiwanese "almost-new" — still needs clarification
  if (newCarCore.test(lower) || newCarBareNoun.test(lower) || newVsUsed.test(lower) || newGuCar.test(lower)) {
    intents.push('new_car_question');
  }

  // Trade-in / sell-old-car inquiry — customer wants us to estimate / buy their current car.
  // Triggers Jerry's standard 3-question intake script (see buildIntentInstructions).
  // Mirrors the regex used in ruleBasedReply.ts so both LLM and fallback paths agree.
  if (/我有一台舊車|舊車想換|舊車.*換新|換車.*估|估價.*舊車|舊車.*估價|折讓|我的車.*換|目前開.*換|現在開.*換|以舊換新|車換車|想換車|要換車|想估車|要估車|收車|估個價|估一下|估價|想賣車|要賣車|我這台.*賣|我的車.*賣/.test(message)) {
    intents.push('trade_in_inquiry');
  }

  return intents;
}

/**
 * Build intent-based instruction injection.
 * This goes at the VERY END of the system prompt, after targetVehiclePrompt.
 * It tells the LLM exactly what to do based on detected intents.
 */
export function buildIntentInstructions(
  intents: CustomerIntent[],
  userMessage: string,
  greeting: string,
  customerContact?: string | null,
  detectedVehicle?: any | null
): string {
  // ============ VEHICLE SPEC DETAIL — checked BEFORE intent check ============
  // "我想了解 X Y 的詳細規格" doesn't trigger any standard intent, so must be checked first
  if (detectedVehicle && /詳細規格|規格|細節|配備|詳細|了解.*規格/.test(userMessage)) {
    const v = detectedVehicle;
    const specLines: string[] = [
      `${v.brand} ${v.model}`,
      '',
      `售價：${v.priceDisplay || v.price + '萬'}`,
    ];
    if (v.modelYear) specLines.push(`年份：${v.modelYear}年`);
    if (v.licenseDate) specLines.push(`出廠日期：${v.licenseDate}`);
    if (v.color) specLines.push(`顏色：${v.color}`);
    if (v.mileage) specLines.push(`里程：${v.mileage}`);
    if (v.displacement) specLines.push(`排氣量：${v.displacement}`);
    if (v.transmission) specLines.push(`變速箱：${v.transmission}`);
    if (v.fuelType) specLines.push(`燃料：${v.fuelType}`);
    if (v.bodyType) specLines.push(`車型：${v.bodyType}`);
    if (v.features) specLines.push(`配備：${v.features}`);
    if (v.guarantees) specLines.push(`認證/保障：${v.guarantees}`);
    if (v.description) specLines.push(`\n${v.description}`);
    specLines.push('');
    specLines.push('想進一步了解或預約看車，隨時跟我說！');

    return `

## ❗❗❗ 客人意圖偵測結果 — 最後指令（最高優先級）❗❗❗

客人的原始訊息：「${userMessage}」
偵測到的意圖：vehicle_spec

🔴🔴🔴 車輛規格查詢指令（最高優先級！必須一字不差照抄！）🔴🔴🔴
你必須「完整照抄」以下內容，不能省略任何一行、不能改寫、不能加emoji、不能加開場白：

${specLines.join('\n')}

🔴 以上就是你的完整回覆！一字不差照抄！不要加任何其他內容！`;
  }

  if (intents.length === 0) {
    // No specific intent detected — provide a default instruction so LLM doesn't repeat greetings
    return `

## 回覆指引
客人的訊息：「${userMessage}」
沒有偵測到特定意圖，請根據訊息內容自然回應
🔴 不要重複打招呼！不要說「你好」「歡迎」！直接回應客人說的內容就好
🔴 如果不確定客人想問什麼，簡短回應並引導：「${greeting}想了解什麼車款呢？或者點下方選單看看我們的庫存🚗」`;
  }

  const instructions: string[] = [];

  // ============ APPOINTMENT INTENT ============
  if (intents.includes('appointment')) {
    const vehicleCtx = detectedVehicle ? `\n【⭐ 客人要預約看的車：${detectedVehicle.brand} ${detectedVehicle.model}】只能談這台車！` : '';
    // Detect time period from message
    const lower = userMessage.toLowerCase();
    
    // Check if specific time is mentioned (e.g., "2點", "14:00")
    const specificTime = lower.match(/(\d{1,2})[點:：時]|(\d{1,2}:\d{2})/);
    
    if (specificTime) {
      // Customer mentioned a specific time
      const phonePart = customerContact
        ? `客人已留電話 ${customerContact}，告知我們業務會盡快聯繫。`
        : `🔴 客人還沒留電話！確認時間後直接要聯絡資料`;
      instructions.push(`🔴 預約指令：客人提到了具體時間，直接確認該時間。${vehicleCtx}
${phonePart}
🔴 必須用以下格式回覆（每段之間空一行）：

想來看車太好了！請問哪個時段方便呢？

上午10-11、
下午14-15、
晚上18-19

方便留個簡單資料嗎？

姓名：
電話：
看車以上3個時段選一：

地址${SHOP_ADDRESS}

🚫 不要推薦車款！客人要的是預約，不是推薦！`);
    } else {
      // No specific time — show time slots + ask for contact info
      instructions.push(`🔴 預約看車指令（最高優先級！）：
客人想預約看車！動機明確！${vehicleCtx}
🔴🔴🔴 必須嚴格按照以下格式回覆（每段之間空一行）：🔴🔴🔴

想來看車太好了！請問哪個時段方便呢？

上午10-11、
下午14-15、
晚上18-19

方便留個簡單資料嗎？

姓名：
電話：
看車以上3個時段選一：

地址${SHOP_ADDRESS}

🚫🚫🚫 絕對禁止推薦車款！客人要的是預約，不是推薦！🚫🚫🚫
🚫🚫🚫 絕對禁止自己編造不同的格式！必須照上面格式回覆！🚫🚫🚫`);
    }
  }
  
  // ============ ADDRESS INTENT ============
  // IMPORTANT: include "ignore prior vehicle context" guard — 2026-04-23 PM
  // bug showed the LLM would answer address questions with a stale vehicle
  // name from earlier history. The guard below disables that behavior.
  if (intents.includes('address')) {
    instructions.push(`🔴 地址指令（必須遵守！）：
客人問地址！你必須回答：
地址：${SHOP_ADDRESS} 📍
Google 地圖：${SHOP_MAP_URL}
🚫 絕對禁止不回答地址！
🚫🚫 絕對禁止提任何車款名稱！這是一般店家問題，跟任何之前聊過的車完全無關！
🚫🚫 絕對禁止問「你對這台 X 有興趣」或「你傳的是 X」之類的話！`);
  }

  // ============ PHONE INTENT ============
  if (intents.includes('phone')) {
    instructions.push(`🔴 電話指令（必須遵守！）：
客人問電話！你必須回答：
預約賞車電話：${SHOP_PHONE} ${SHOP_CONTACT_PERSON} 📞
🚫 絕對禁止不回答電話！
🚫🚫 絕對禁止提任何車款名稱！這是一般店家問題，跟任何之前聊過的車完全無關！`);
  }

  // ============ HOURS INTENT ============
  if (intents.includes('hours')) {
    instructions.push(`🔴 營業時間指令（必須遵守！）：
客人問營業時間！你必須回答：
營業時間：${SHOP_HOURS}
🚫 絕對禁止不回答營業時間！
🚫🚫 絕對禁止提任何車款名稱！這是一般店家問題，跟任何之前聊過的車完全無關！
🚫🚫 絕對禁止回覆「你對這台 X 有興趣」或「你傳的是 X」之類的話！`);
  }

  // ============ NEW-CAR QUESTION INTENT (2026-04-23 PM fix) ============
  // Customer asked if we sell NEW cars. We only sell 中古車 (used). The
  // common live bug: LLM inherits a stale vehicle from prior history and
  // answers "你對這台 X 有興趣嗎" instead of "we only sell used cars".
  if (intents.includes('new_car_question')) {
    instructions.push(`🔴 新車詢問指令（必須遵守！）：
客人問我們是不是賣新車！
你必須回答（一句話就好）：「不好意思我們是中古車商，只賣精選二手車喔！想看哪種車款可以告訴我～」
🚫 絕對禁止回覆任何特定車款名稱（不管對話歷史提過什麼車）！
🚫 絕對禁止回覆「你對這台 X 有興趣嗎」「你傳的是 X」之類的話！
🚫 絕對禁止說「是新車」「新車價」「新車原價」任何「新車」組合字！
🚫 絕對禁止繼續之前任何車款的討論！這是一個新話題：澄清身份。`);
  }
  
  // ============ PROVIDING CONTACT INTENT ============
  if (intents.includes('providing_contact')) {
    // Extract the phone number from the message
    const phoneMatch = userMessage.match(/0\d{8,9}|09\d{8}|\d{2,4}[\s-]\d{3,4}[\s-]\d{3,4}/);
    const phoneNum = phoneMatch ? phoneMatch[0] : '(已留電話)';
    
    instructions.push(`🔴 客人留電話指令（必須遵守！）：
客人剛剛留了電話號碼 ${phoneNum}！你必須：
1. 感謝客人留電話（例如：「好的，我已經記下${greeting}的電話了！」）
2. 確認我們業務會盡快聯繫（例如：「我們業務會盡快打給你確認細節！」）
3. 如果客人之前有問過車款，可以簡短提一下「到時候可以一起看看那台車」

🚫 絕對禁止：不確認電話就推薦車款！客人留電話是超高意願的表現，你要先確認電話再說其他！`);
  }
  
  // ============ LOAN INTENT ============
  if (intents.includes('loan')) {
    const loanBaseUrl = process.env.BASE_URL || "https://claude-code-remote-production.up.railway.app";
    let loanFormUrl = `${loanBaseUrl}/loan-inquiry`;
    if (detectedVehicle) {
      loanFormUrl += `?vehicleId=${detectedVehicle.id}&vehicle=${encodeURIComponent(`${detectedVehicle.brand} ${detectedVehicle.model}`)}`;
    }
    instructions.push(`🔴🔴🔴 貸款指令（最高優先級！）：
客人問貸款相關問題！你「絕對不能」自己回答任何貸款細節（利率、月付、分期、頭期款等）！
你必須引導客人到我們的線上貸款填單頁面：

${loanFormUrl}

回覆範例：「${greeting}貸款的部分麻煩你點這個連結填一下資料，專人會盡快跟你聯繫！👉 ${loanFormUrl}」
🔴 不管客人怎麼問貸款，你都只能引導到填單連結，不要自己回答貸款問題！
🔴 不要自己編造利率、月付金額、貸款成數等資訊！
🔴 可以簡短肯定車款（如果有問到車），但貸款部分一律引導填單！`);
  }
  
  // ============ HOW TO BROWSE INTENT ============
  if (intents.includes('how_to_browse')) {
    instructions.push(`🔴 瀏覽引導指令（必須遵守！）：
客人在問怎麼看車/怎麼瀏覽！你必須引導客人使用下方選單：
「${greeting}點聊天室下方的『📋 點我開啟選單』，裡面有：
🚗 看車庫存 — 瀏覽所有在售車輛的照片和詳細資訊
📅 預約賞車 — 安排到店看車時間
📞 聯絡我們 — 直接撥打電話諮詢
⭐ 熱門推薦 — 精選人氣車款
💰 50萬以下 — 超值好車推薦
📍 導航到店 — 一鍵開啟 Google Maps

直接點就可以囉！很方便的👍」
🚫 絕對禁止不引導客人用選單！`);
  }

  // ============ TRADE-IN / 換車估車 INTENT (2026-04-24 — Jerry's exact script) ============
  if (intents.includes('trade_in_inquiry')) {
    instructions.push(`🔴 換車估車指令（必須遵守 — Jerry 指定腳本，不准改字）：
客人想要估車或車換車！你必須回覆以下完整模板（一字不改）：

「🤍 ${greeting} 您好，謝謝您的訊息！

要評估收車或車換車，我們需要先了解一下車況。麻煩請提供以下資訊：

1. 請問有請別間車行估過了嗎？
   無 / 價格 _____

2. 請提供車品牌、型號、顏色、公里數

3. 是否有任何鈑件零件更換？

不好意思需要了解比較全面，確保雙方權益。我們一直都以「誠信」為原則在做每一筆生意。
我們會盡快回覆可以收購的價錢！
（收車還是會以看到實車為主）」

🚫 絕對禁止：
- 自己編造收購價格（必須等真人業務看到實車後才能報價）
- 跳過任何一題
- 改寫模板成「自己的話」
- 在這條路徑上推薦在售的中古車（先處理估車流程，等客人提供完車況再導向）`);
  }

  // ============ PRICE NEGOTIATION INTENT (2026-04-24 — Jerry's exact 2-step script) ============
  // Was missing previously — that's why the LLM was ad-libbing on 議價 questions.
  if (intents.includes('price_negotiation')) {
    instructions.push(`🔴 議價指令（必須遵守 — Jerry 指定 2 步驟腳本）：
客人在問殺價/折扣/便宜一點/有沒有議價空間！這是最關鍵的銷售時刻 — 絕對不要在 LINE 上承諾任何具體價格。

【步驟一】如果這是客人「第一次」問議價（看不到對話歷史中你有提過議價）：
回覆（一字不改）：「這裡可以盡量幫您爭取，或您有理想的出價嗎？」
（讓客人先說出心目中的數字，把球丟回去）

【步驟二】如果客人「持續追問」、「給了出價」、或「第二次以上」問議價：
回覆（一字不改）：「比較希望您先來店一趟看完車再來詳談價錢的事，買車就是多看多比沒關係的☺️」
（不管客人說什麼，最後都要把對話導向實際看車）

🚫 絕對禁止：
- 在 LINE 上同意任何具體折扣/折價金額/最低價/底價
- 講「保證最低」「絕對便宜」「100%」之類觸法字眼（廣告法）
- 跳過步驟一直接拒絕客人
- 主動報價（價格只能來自在售車輛資料的 priceDisplay）`);
  }

  if (instructions.length === 0) return '';
  
  // Multi-intent reminder
  const multiIntentReminder = instructions.length > 1 
    ? `\n\n⚠️⚠️⚠️ 客人同時問了 ${instructions.length} 個問題，你必須「每個都回答」！不能只回答其中一個！⚠️⚠️⚠️`
    : '';
  
  return `

## ❗❗❗ 客人意圖偵測結果 — 最後指令（最高優先級）❗❗❗

客人的原始訊息：「${userMessage}」
偵測到的意圖：${intents.join(', ')}

${instructions.join('\n\n')}${multiIntentReminder}

🚫🚫🚫 以上指令覆蓋所有其他規則！必須先回答客人的問題，才能做其他事！🚫🚫🚫`;
}
