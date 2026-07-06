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

  // Reject if it's a range (30到50萬, 30-50萬, etc.)
  if (/\d+\s*(?:到|～|~|-)\s*\d+/.test(message)) {
    return undefined;
  }

  // Pattern: "預算30萬" or "30萬" or "30万" (simplified Chinese)
  const budgetMatch = message.match(/(?:預算|budget|我的預算)\s*([1-9]\d{0,2})(?:萬|万|w)(?![0-9])/i);
  if (budgetMatch) {
    const amount = parseInt(budgetMatch[1], 10);
    return amount * 100000; // Convert to base units (30 → 3000000)
  }

  // Pattern: "30萬左右" or "大概30萬" - but NOT if it's part of a range
  if (!/\d+\s*(?:到|～|~|-)\s*\d+/.test(message)) {
    const approxMatch = message.match(/([1-9]\d{0,2})(?:萬|万|w)(?:左右|以內|以下)?/);
    if (approxMatch) {
      const amount = parseInt(approxMatch[1], 10);
      return amount * 100000;
    }
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
  // Brand mappings (Chinese → English standardization)
  const brandMap: Record<string, string> = {
    '豐田': 'Toyota',
    '本田': 'Honda',
    '日產': 'Nissan',
    '馬自達': 'Mazda',
    '三菱': 'Mitsubishi',
    '鈴木': 'Suzuki',
    '速霸陸': 'Subaru',
    '寶馬': 'BMW',
    '賓士': 'Mercedes-Benz',
    '奧迪': 'Audi',
    '福斯': 'Volkswagen',
    '保時捷': 'Porsche',
    '現代': 'Hyundai',
    '起亞': 'Kia',
    '福特': 'Ford',
    'toyota': 'Toyota',
    'honda': 'Honda',
    'nissan': 'Nissan',
    'mazda': 'Mazda',
    'mitsubishi': 'Mitsubishi',
    'suzuki': 'Suzuki',
    'subaru': 'Subaru',
    'bmw': 'BMW',
    'mercedes-benz': 'Mercedes-Benz',
    'audi': 'Audi',
    'volkswagen': 'Volkswagen',
    'porsche': 'Porsche',
    'hyundai': 'Hyundai',
    'kia': 'Kia',
    'ford': 'Ford',
  };

  // First check if message contains preference keywords
  if (!/喜歡|想要|想買|偏好|考慮|看|有興趣|要/.test(message)) {
    return undefined;
  }

  // Search for brands
  const found: string[] = [];
  const lowerMsg = message.toLowerCase();

  for (const [key, englishName] of Object.entries(brandMap)) {
    if (lowerMsg.includes(key.toLowerCase())) {
      // Avoid duplicates (prefer English name)
      if (!found.includes(englishName)) {
        found.push(englishName);
      }
    }
  }

  return found.length > 0 ? found.join(',') : undefined;
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
  if (!/什麼時候|什么时候|何時|哪天|下週|這週|今天|明天|年底前|過年前|急|盡快|馬上|方便/.test(message)) {
    return undefined;
  }

  // Patterns: Try multi-word first ("週末下午"), then fallback to single words
  const multiWordMatch = message.match(/(週末|平日)?(早上|上午|中午|下午|晚上|夜間|全天)|週末|過年前/);
  if (multiWordMatch) {
    // Join matched groups, filtering out undefined/empty
    const combined = multiWordMatch.slice(1, 3).filter(Boolean).join('');
    if (combined) return combined;
    return multiWordMatch[0]; // Return the whole match if combined is empty
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
