// ============ PHONE NUMBER DETECTION ============

// Detect Taiwan mobile phone numbers from chat messages
// Supports: 0912345678, 0912-345-678, 09 1234 5678, +886912345678, etc.
export function detectPhoneNumber(text: string): string | null {
  // Taiwan mobile patterns
  const patterns = [
    /(?:\+886|886)[\s-]?0?9\d{2}[\s-]?\d{3}[\s-]?\d{3}/,
    /09\d{2}[\s-]?\d{3}[\s-]?\d{3}/,
    /09\d{2}[\s-]?\d{6}/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Normalize to 09xx-xxx-xxx format
      const raw = match[0].replace(/[\s-+]/g, '');
      let digits = raw;
      if (digits.startsWith('886')) {
        digits = '0' + digits.slice(3);
      }
      if (digits.length === 10 && digits.startsWith('09')) {
        return `${digits.slice(0,4)}-${digits.slice(4,7)}-${digits.slice(7)}`;
      }
    }
  }

  // Also detect landline numbers (07-xxx-xxxx, 02-xxxx-xxxx, etc.)
  const landlineMatch = text.match(/0[2-9][\s-]?\d{3,4}[\s-]?\d{4}/);
  if (landlineMatch) {
    const raw = landlineMatch[0].replace(/[\s-]/g, '');
    if (raw.length >= 9 && raw.length <= 10) {
      return raw;
    }
  }

  return null;
}

// ============ GENDER DETECTION FROM NAME ============

// Detect gender from customer display name using common Chinese name patterns
export function detectGenderFromName(name: string | null): 'male' | 'female' | 'unknown' {
  if (!name) return 'unknown';

  const cleanName = name.trim();
  if (!cleanName) return 'unknown';

  // Common female indicators in Chinese names
  const femalePatterns = [
    /女士/, /小姐/, /媽媽/, /阿姨/, /姐姐/, /妹妹/, /嫂/,
    /太太/, /夫人/, /姑姑/, /婆婆/, /阿嬤/, /奶奶/,
  ];

  // Common male indicators in Chinese names
  const malePatterns = [
    /先生/, /大哥/, /爸爸/, /叔叔/, /伯伯/, /哥哥/, /弟弟/,
    /阿伯/, /阿公/, /爺爺/, /老闆/,
  ];

  for (const p of femalePatterns) {
    if (p.test(cleanName)) return 'female';
  }
  for (const p of malePatterns) {
    if (p.test(cleanName)) return 'male';
  }

  // Check last character of name for common gender-specific characters
  // (only if name looks like a Chinese name, 2-4 characters)
  if (/^[\u4e00-\u9fff]{2,4}$/.test(cleanName)) {
    const lastChar = cleanName[cleanName.length - 1];
    const secondChar = cleanName.length >= 2 ? cleanName[cleanName.length - 2] : '';

    // Common female name characters
    const femaleChars = '美麗娟芳萍婷玲珍雅惠淑芬蘭英華玉秀芝蓉琴嬌嫻靜慧瑩瑤琳珊蕙薇蓮菊瑜彤妍姿婉嫣韻';
    // Common male name characters
    const maleChars = '雄偉強剛明志豪傑龍勇軍輝鵬飛武斌鑫磊峰彪昌棟柱亮宏達建國榮勝德福財旺';

    if (femaleChars.includes(lastChar)) return 'female';
    if (maleChars.includes(lastChar)) return 'male';
    if (femaleChars.includes(secondChar)) return 'female';
    if (maleChars.includes(secondChar)) return 'male';
  }

  return 'unknown';
}

// Get the appropriate greeting based on gender (fallback when no name)
export function getGenderGreeting(gender: 'male' | 'female' | 'unknown'): string {
  switch (gender) {
    case 'male': return '大哥';
    case 'female': return '小姐';
    case 'unknown': return '人客';
  }
}

// ============ OPERATOR (STAFF) IDENTIFICATION ============
//
// LINE Webhook does NOT receive outbound messages sent by staff via the
// LINE Official Account Manager console. To work around this, we let
// staff (Megan etc.) send control commands or tap takeover buttons from
// THEIR OWN personal LINE chat with the bot — those messages DO fire the
// webhook and we recognize them by the sender's LINE userId.
//
// Whitelist sources (any-of):
//   1. LINE_OPERATOR_USER_IDS  — preferred, comma-separated
//   2. LINE_OWNER_USER_ID      — already-existing single owner
//   3. LINE_ADDITIONAL_NOTIFY_USER_IDS — already-existing notify list
export function getOperatorUserIds(): string[] {
  const set = new Set<string>();
  const sources = [
    process.env.LINE_OPERATOR_USER_IDS,
    process.env.LINE_OWNER_USER_ID,
    process.env.LINE_ADDITIONAL_NOTIFY_USER_IDS,
  ];
  for (const raw of sources) {
    if (!raw) continue;
    for (const id of raw.split(',').map(s => s.trim()).filter(Boolean)) {
      set.add(id);
    }
  }
  return Array.from(set);
}

export function isOperator(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return getOperatorUserIds().includes(userId);
}

// ============ OPERATOR SLASH-COMMAND PARSER ============
//
// Operators text the bot from their own LINE. Recognized commands (case-insensitive
// for the verb; targets are exact-match against the conversation table):
//
//   /lock                  → lock the most recently active LINE conversation
//   /lock <last8>          → lock the conversation whose sessionId ends with <last8>
//   /unlock <last8>        → re-enable AI on that conversation
//   /list                  → show the 5 most-recently-active LINE conversations
//   /status <last8>        → show one conversation's lock state + last message
//   /help                  → show command help
//
// Both /  and ! prefixes are accepted (Chinese keyboards default to ! easily).
export type OperatorCommand =
  | { kind: 'lock'; target: string | null }
  | { kind: 'unlock'; target: string | null }
  | { kind: 'list'; target: string | null } // optional 'full' modifier
  | { kind: 'status'; target: string | null }
  | { kind: 'help' }
  | null;

export function parseOperatorCommand(text: string): OperatorCommand {
  if (!text) return null;
  const trimmed = text.trim();
  // Only react to messages that start with /, !, or their full-width
  // counterparts (／／！) — Chinese IMEs default to full-width punctuation.
  // Never accidentally treat a customer-style message as a command.
  if (!/^[/!／！]/.test(trimmed)) return null;
  const body = trimmed.slice(1).trim();
  const [verbRaw, ...rest] = body.split(/\s+/);
  const verb = (verbRaw || '').toLowerCase();
  const target = rest.length > 0 ? rest.join(' ').trim() : null;

  switch (verb) {
    case 'lock':
    case '鎖':
    case '鎖定':
    case '接手':
      return { kind: 'lock', target };
    case 'unlock':
    case '解鎖':
    case '解':
      return { kind: 'unlock', target };
    case 'list':
    case 'ls':
    case '清單':
    case '列表':
      return { kind: 'list', target };
    case 'status':
    case '狀態':
      return { kind: 'status', target };
    case 'help':
    case '?':
    case '？':
    case '幫助':
      return { kind: 'help' };
    default:
      // Unknown verb after a recognized prefix — return 'help' so the operator
      // gets the command list back instead of the bot silently accepting their
      // typo as a customer message.
      return { kind: 'help' };
  }
}

// Get a friendly name-based greeting from customer's display name
// e.g., "王雅玲" → "雅玲", "小明" → "小明", "John" → "John"
export function getNameGreeting(name: string | null, gender: 'male' | 'female' | 'unknown'): string {
  if (!name || !name.trim()) return getGenderGreeting(gender);

  const clean = name.trim();

  // Pure Chinese name: extract given name
  if (/^[\u4e00-\u9fff]{2,4}$/.test(clean)) {
    if (clean.length === 2) return clean; // 2-char name: use full name (e.g., "雅玲")
    if (clean.length === 3) return clean.slice(1); // 3-char: use given name (e.g., "王雅玲" → "雅玲")
    if (clean.length === 4) return clean.slice(2); // 4-char: use last 2 (e.g., "司馬相如" → "相如")
  }

  // Mixed or non-Chinese name: use as-is if short, otherwise truncate
  if (clean.length <= 10) return clean;
  return getGenderGreeting(gender);
}
