/**
 * Customer Memory Extractor
 *
 * Extracts customer preferences from messages:
 * - Budget amount (e.g., "30萬" → 3000000)
 * - Budget range (e.g., "30-50萬" → "30-50")
 * - Preferred brands (e.g., "Toyota 或 Honda" → "Toyota,Honda")
 * - Preferred body type (e.g., "SUV" → "SUV")
 * - Visit time preference (e.g., "週末下午" → "週末下午")
 *
 * Only extracts if confidence is high (explicit mention, not just context).
 */

export interface ExtractedPreferences {
  budget?: number;
  budgetRange?: string;
  preferredBrand?: string;
  preferredBodyType?: string;
  preferredVisitTime?: string;
}

/**
 * Extract budget from message.
 *
 * Patterns:
 * - "預算30萬" → 3000000
 * - "30到50萬" → null (use budgetRange instead)
 * - "50萬以下" → null
 * - "多少錢" → null (question, not statement)
 */
export function extractBudget(message: string): number | undefined {
  // Reject if it's a question (asking about budget, not stating it)
  if (/多少錢|價格多少|預算多少|最便宜|最貴|比較便宜/.test(message)) {
    return undefined;
  }

  // Pattern: "預算30萬" or "30萬" or "30万" (simplified Chinese)
  const budgetMatch = message.match(/(?:預算|budget|我的預算)\s*([1-9]\d{0,2})(?:萬|万|w)(?![0-9])/i);
  if (budgetMatch) {
    const amount = parseInt(budgetMatch[1], 10);
    return amount * 100000; // Convert to base units (30 → 3000000)
  }

  // Pattern: "30萬左右" or "大概30萬"
  const approxMatch = message.match(/(?:大概|差不多|約)?\s*([1-9]\d{0,2})(?:萬|万|w)(?:左右|以內|以下)?/);
  if (approxMatch) {
    const amount = parseInt(approxMatch[1], 10);
    return amount * 100000;
  }

  return undefined;
}

/**
 * Extract budget range (e.g., "30-50萬" → "30-50")
 */
export function extractBudgetRange(message: string): string | undefined {
  // Pattern: "30到50萬" or "30-50萬" or "30~50萬"
  const rangeMatch = message.match(/([1-9]\d{0,2})\s*(?:到|～|~|-)\s*([1-9]\d{0,2})\s*(?:萬|万|w)/i);
  if (rangeMatch) {
    return `${rangeMatch[1]}-${rangeMatch[2]}`;
  }

  return undefined;
}

/**
 * Extract preferred brands (e.g., "喜歡 Honda 或 Toyota" → "Honda,Toyota")
 */
export function extractPreferredBrand(message: string): string | undefined {
  // List of car brands to look for
  const brands = [
    'Toyota', 'Honda', 'Nissan', 'Mazda', 'Mitsubishi', 'Suzuki', 'Subaru',
    'BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Porsche',
    'Hyundai', 'Kia',
    'Ford', 'Chevrolet',
    '豐田', '本田', '日產', '馬自達', '三菱', '鈴木', '速霸陸',
    '寶馬', '賓士', '奧迪', '福斯', '保時捷',
    '現代', '起亞', '福特',
  ];

  // Case-insensitive search
  const found: string[] = [];
  const lowerMsg = message.toLowerCase();

  for (const brand of brands) {
    if (lowerMsg.includes(brand.toLowerCase())) {
      // Avoid duplicates
      if (!found.some(b => b.toLowerCase() === brand.toLowerCase())) {
        found.push(brand);
      }
    }
  }

  // Only return if we found brands AND the message context suggests preference
  if (found.length > 0 && /喜歡|想要|偏好|考慮|看|有興趣/.test(message)) {
    return found.join(',');
  }

  return undefined;
}

/**
 * Extract preferred body type (e.g., "想買 SUV" → "SUV")
 */
export function extractPreferredBodyType(message: string): string | undefined {
  const bodyTypes = [
    'SUV', 'MPV', 'Sedan', '轎車', '休旅車', '跨界車', '皮卡',
    'SUV', 'RV', '廂型車',
  ];

  // Patterns like "想買SUV" or "喜歡轎車" or "我要MPV"
  if (!/想|要|喜歡|偏好|考慮|看|有興趣/.test(message)) {
    return undefined;
  }

  for (const type of bodyTypes) {
    if (message.includes(type)) {
      return type;
    }
  }

  return undefined;
}

/**
 * Extract visit time preference (e.g., "週末下午" → "週末下午")
 */
export function extractPreferredVisitTime(message: string): string | undefined {
  // Only extract if the context is about when to visit
  if (!/什麼時候|什么时候|何時|哪天|下週|這週|今天|明天|年底前|過年前|急|盡快|馬上/.test(message)) {
    return undefined;
  }

  // Patterns: "週末下午", "平日下午", "晚上", etc.
  const timeMatch = message.match(/(週末|平日|今天|明天|下週|這週|早上|上午|中午|下午|晚上|夜間|全天)/);
  if (timeMatch) {
    return timeMatch[1];
  }

  return undefined;
}

/**
 * Extract all customer preferences from a single message
 */
export function extractCustomerPreferences(message: string): ExtractedPreferences {
  return {
    budget: extractBudget(message),
    budgetRange: extractBudgetRange(message),
    preferredBrand: extractPreferredBrand(message),
    preferredBodyType: extractPreferredBodyType(message),
    preferredVisitTime: extractPreferredVisitTime(message),
  };
}

/**
 * Format budget for display (3000000 → "30萬")
 */
export function formatBudgetForDisplay(budget: number | null | undefined): string {
  if (!budget) return '';
  const inWan = Math.round(budget / 100000);
  return `${inWan}萬`;
}
