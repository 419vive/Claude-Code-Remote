/**
 * Regression repro + fix verification for the 2026-04-23 PM bug:
 * Customer asks "營業時間" / "你們賣新車嗎" and AI responds about a
 * random vehicle (Toyota Corolla Cross GR Sport) — completely ignoring
 * the question.
 *
 * Root cause confirmed: buildLLMMessages was only clearing conversation
 * history for inquiry_button detection. For everything else, prior-session
 * assistant messages mentioning Toyota leaked into the LLM context,
 * causing recency-bias hallucination.
 *
 * Fix: `shouldClearHistoryForFreshTopic` also clears when the user asks a
 * general-business question (hours/address/phone/new_car) AND no vehicle is
 * detected in the current message AND no context-reference words.
 */

import { describe, it, expect } from "vitest";
import {
  detectVehicleFromMessage,
  buildVehicleIndex,
  detectCustomerIntents,
  detectQuestionType,
} from "./vehicleDetectionService";
import { buildLLMMessages } from "./dynamicPromptBuilder";

const mockInventory = [
  { id: 1, brand: "Toyota", model: "Corolla Cross GR Sport", modelYear: 2024, priceDisplay: "85萬", price: 85, status: "available" },
  { id: 2, brand: "Mazda", model: "CX-5", modelYear: 2021, priceDisplay: "55萬", price: 55, status: "available" },
  { id: 3, brand: "Mercedes-Benz", model: "Mufasa 2.0 GLC旗艦版", modelYear: 2020, priceDisplay: "80.9萬", price: 80.9, status: "available" },
];

const index = buildVehicleIndex(mockInventory);

// Simulates the live condition: prior session persisted assistant messages
// that mention Toyota Corolla Cross GR Sport. The NEW session's customer
// asks a fresh general question; history is loaded from DB with 5+ turns
// of prior Toyota discussion.
const staleToyotaHistory = [
  { role: "user", content: "哈囉我有看到你們一台 Toyota Corolla Cross GR Sport" },
  { role: "assistant", content: "好的！這台 Toyota Corolla Cross GR Sport 是我們精選車款..." },
  { role: "user", content: "多少錢" },
  { role: "assistant", content: "Toyota Corolla Cross GR Sport 售價 85萬！想了解什麼呢？" },
  // ... days pass ...
  { role: "user", content: "營業時間" }, // ← TODAY's message
];

function makePromptContext(userMessage: string, detection: any, intents: string[]): any {
  return {
    greeting: "人客",
    vehicleKB: "（11 台車）",
    targetVehiclePrompt: "",
    intentInstructions: "",
    detection,
    intents,
    customerContact: null,
    userMessage,
    inventoryList: mockInventory.map(v => `${v.brand} ${v.model}`),
  };
}

// ============================================================
// Part 1: Detection is already correct (no regression)
// ============================================================

describe("vehicle detection returns 'none' for general questions", () => {
  it("'營業時間' with empty history → type='none'", () => {
    const r = detectVehicleFromMessage("營業時間", mockInventory, [], index);
    expect(r.type).toBe("none");
    expect(r.vehicle).toBe(null);
  });

  it("'你們賣新車嗎' with empty history → type='none'", () => {
    const r = detectVehicleFromMessage("你們賣新車嗎", mockInventory, [], index);
    expect(r.type).toBe("none");
    expect(r.vehicle).toBe(null);
  });
});

// ============================================================
// Part 2: New 'new_car_question' intent works
// ============================================================

describe("new_car_question intent detection", () => {
  it("'你們賣新車嗎' → intents include 'new_car_question'", () => {
    const intents = detectCustomerIntents("你們賣新車嗎");
    expect(intents).toContain("new_car_question");
  });

  it("'你們有沒有新車' → intents include 'new_car_question'", () => {
    const intents = detectCustomerIntents("你們有沒有新車");
    expect(intents).toContain("new_car_question");
  });

  it("'想買新車' → intents include 'new_car_question'", () => {
    const intents = detectCustomerIntents("想買新車");
    expect(intents).toContain("new_car_question");
  });

  it("'這台新車主還是什麼' → does NOT trigger (新車主 is used-car context)", () => {
    // 新車主 = "new owner of this (used) car" — legit used-car phrase.
    const intents = detectCustomerIntents("這台新車主還是什麼");
    expect(intents).not.toContain("new_car_question");
  });

  it("'這款新車型好看' → does NOT trigger (新車型 = new model variant)", () => {
    // 新車型 = "new model variant" — refers to a newly listed used car.
    const intents = detectCustomerIntents("這款新車型好看");
    expect(intents).not.toContain("new_car_question");
  });
});

// ============================================================
// Part 3: buildLLMMessages clears history on fresh topic (THE FIX)
// ============================================================

describe("buildLLMMessages clears stale history when customer switches topic", () => {
  it("'營業時間' after Toyota history → NO Toyota in LLM messages", () => {
    const ctx = makePromptContext(
      "營業時間",
      { type: "none", vehicle: null, questionType: "general", directAnswer: "", termExplanation: "" },
      ["hours"],
    );
    const messages = buildLLMMessages(ctx, staleToyotaHistory);
    // System prompt + last user message = 2. With the fix, history messages 0-3 are dropped.
    const nonSystemNonLastContent = messages
      .filter(m => m.role !== "system")
      .slice(0, -1) // drop last user message ("營業時間")
      .map(m => m.content)
      .join(" ");
    expect(nonSystemNonLastContent).not.toContain("Toyota");
    expect(nonSystemNonLastContent).not.toContain("Corolla");
  });

  it("'你們賣新車嗎' after Toyota history → NO Toyota in LLM messages", () => {
    const staleHistoryWithNewCarQ = [
      ...staleToyotaHistory.slice(0, -1),
      { role: "user", content: "你們賣新車嗎" },
    ];
    const ctx = makePromptContext(
      "你們賣新車嗎",
      { type: "none", vehicle: null, questionType: "general", directAnswer: "", termExplanation: "" },
      ["new_car_question"],
    );
    const messages = buildLLMMessages(ctx, staleHistoryWithNewCarQ);
    const nonSystemNonLastContent = messages
      .filter(m => m.role !== "system")
      .slice(0, -1)
      .map(m => m.content)
      .join(" ");
    expect(nonSystemNonLastContent).not.toContain("Toyota");
    expect(nonSystemNonLastContent).not.toContain("Corolla");
  });

  it("'地址' after Toyota history → NO Toyota in LLM messages", () => {
    const ctx = makePromptContext(
      "地址",
      { type: "none", vehicle: null, questionType: "general", directAnswer: "", termExplanation: "" },
      ["address"],
    );
    const messages = buildLLMMessages(
      ctx,
      [...staleToyotaHistory.slice(0, -1), { role: "user", content: "地址" }],
    );
    const nonSystemNonLastContent = messages
      .filter(m => m.role !== "system")
      .slice(0, -1)
      .map(m => m.content)
      .join(" ");
    expect(nonSystemNonLastContent).not.toContain("Toyota");
  });

  it("'那台多少錢' after Toyota history → KEEPS Toyota in history (context follow-up)", () => {
    // Anti-regression: follow-up references ("那台") MUST keep their context.
    // Otherwise we'd break multi-turn vehicle inquiry flows.
    const history = [
      { role: "user", content: "我想看 Toyota Corolla Cross GR Sport" },
      { role: "assistant", content: "好的這台 Toyota Corolla Cross GR Sport 是 2024 年..." },
      { role: "user", content: "那台多少錢" },
    ];
    const ctx = makePromptContext(
      "那台多少錢",
      {
        type: "context",
        vehicle: mockInventory[0],
        questionType: "price",
        directAnswer: "售價 85萬",
        termExplanation: "",
      },
      ["pricing"],
    );
    const messages = buildLLMMessages(ctx, history);
    const nonSystemContent = messages
      .filter(m => m.role !== "system")
      .map(m => m.content)
      .join(" ");
    // History should be intact — Toyota context must be preserved for the follow-up.
    expect(nonSystemContent).toContain("Toyota");
  });

  it("Active vehicle inquiry (detection.type='mentioned') does NOT clear history", () => {
    // Another anti-regression: if the current message explicitly names a
    // vehicle, the history stays so the LLM has full conversation context.
    const history = [
      { role: "user", content: "你好" },
      { role: "assistant", content: "你好！我們有 Toyota Corolla Cross GR Sport、Mazda CX-5..." },
      { role: "user", content: "Mazda CX-5 多少錢" },
    ];
    const ctx = makePromptContext(
      "Mazda CX-5 多少錢",
      {
        type: "mentioned",
        vehicle: mockInventory[1],
        questionType: "price",
        directAnswer: "售價 55萬",
        termExplanation: "",
      },
      ["pricing"],
    );
    const messages = buildLLMMessages(ctx, history);
    // History preserved.
    expect(messages.filter(m => m.role !== "system").length).toBeGreaterThan(1);
  });
});

// ============================================================
// Part 4: QA — regex evasion probes (added 2026-04-23 after adversarial review)
// Every case in this block was a concrete gap found while trying to break the
// original fix. Keep them as regressions.
// ============================================================

describe("new_car_question — adversarial phrasings (all MUST trigger)", () => {
  const evasionPhrases = [
    "你們家有新車嗎",       // 家 inserted between 們 and 有
    "新車可以買嗎",          // 可以 particle
    "請問新車",              // bare noun, no verb
    "我要新車",              // "I want new car"
    "有賣新車的話",          // 的話 tail
    "你們現在是有新車還是中古的",
    "你們是新的還是中古",    // 新的 vs 中古 contrastive (no "新車" word at all)
    "有沒有全新的",
    "全新的車有嗎",
    "只賣二手嗎還是新的也有",
    "新古車有嗎",            // Taiwanese slang
    "新車價格多少",
    "新的一台多少",
    "你們主打新車嗎",
    "你們走新車路線嗎",      // bonus: also hits address (路線); either clears history
    "新車呢？",
    "你們只做中古還是也賣新車",
    "新車的部分",
    "不是要中古的，我要新的", // 新的 after comma
  ];
  evasionPhrases.forEach(phrase => {
    it(`'${phrase}' → new_car_question intent fires`, () => {
      const intents = detectCustomerIntents(phrase);
      expect(intents).toContain("new_car_question");
    });
  });
});

describe("new_car_question — false-positive guards (none MUST trigger)", () => {
  const benignPhrases = [
    "這台很新",
    "新車況",        // used-car condition descriptor
    "像新車一樣",    // "looks like new" — simile
    "新車險",        // insurance policy name
    "全新車況",      // brand-new condition (still used-car context)
    "車況跟新的一樣",
    "看起來很新",
    "這台新不新",    // asking about condition, not inventory type
    "新車主很好聊",  // "new owner" — 新車主
    "新車款",        // new model variant (used)
    "新車型",
    "這台的新車主會換嗎",
    "新車險怎麼保",
    "跟新車一樣",
    "好比新車",
  ];
  benignPhrases.forEach(phrase => {
    it(`'${phrase}' → does NOT trigger new_car_question`, () => {
      const intents = detectCustomerIntents(phrase);
      expect(intents).not.toContain("new_car_question");
    });
  });
});

describe("address intent — Taiwanese colloquial phrasings (all MUST trigger)", () => {
  const addressPhrases = [
    "你們住哪",        // colloquial "where do you sit/live"
    "地圖傳一下",      // "send me the map"
    "GPS座標",         // navigation request
    "怎麼去你們店",    // already worked — regression lock
    "你們家在哪",      // 家 instead of 店
  ];
  addressPhrases.forEach(phrase => {
    it(`'${phrase}' → address intent fires`, () => {
      const intents = detectCustomerIntents(phrase);
      expect(intents).toContain("address");
    });
  });
});

describe("hours intent — day-name probes (all MUST trigger)", () => {
  const hoursPhrases = [
    "星期日營業嗎",    // 星期 + 營業 (previously slipped — only 週/禮拜 were matched via 有開嗎)
    "禮拜日有營業嗎",
    "週一有營業嗎",
  ];
  hoursPhrases.forEach(phrase => {
    it(`'${phrase}' → hours intent fires`, () => {
      const intents = detectCustomerIntents(phrase);
      expect(intents).toContain("hours");
    });
  });
});

describe("history-clear context-ref guard (follow-ups preserve history)", () => {
  // Each of these would WRONGLY clear history under a naive implementation.
  // With the `^(那|這台|那台|這個|...)/` guard, they keep context.
  const followUps = [
    "這台在哪",      // "where is THIS car" → vehicle address, not shop
    "這台的位置",
    "它在哪",
    "那台在哪裡",
    "這個位置",
    "這台導航傳一下",
    "這台路線",
  ];
  followUps.forEach(phrase => {
    it(`'${phrase}' → history NOT cleared (context ref preserved)`, () => {
      const history = [
        { role: "user", content: "Toyota Corolla Cross GR Sport" },
        { role: "assistant", content: "好的這台 Toyota Corolla Cross GR Sport..." },
        { role: "user", content: phrase },
      ];
      // detection.type=context (or mentioned) typically — but even with 'none',
      // the ^那|這台|... guard should protect.
      const ctx = makePromptContext(
        phrase,
        { type: "none", vehicle: null, questionType: "general", directAnswer: "", termExplanation: "" },
        ["address"],
      );
      const messages = buildLLMMessages(ctx, history);
      const joined = messages.filter(m => m.role !== "system").map(m => m.content).join(" ");
      expect(joined).toContain("Toyota");
    });
  });
});

describe("regression: exact live-bug phrasings still clear Toyota history", () => {
  const liveBugInputs = [
    { msg: "營業時間",           intents: ["hours"] as string[] },
    { msg: "你們賣新車嗎",       intents: ["new_car_question"] as string[] },
    { msg: "你們家有新車嗎",     intents: ["new_car_question"] as string[] },
    { msg: "請問新車",           intents: ["new_car_question"] as string[] },
    { msg: "星期日營業嗎",       intents: ["hours"] as string[] },
    { msg: "地圖傳一下",         intents: ["address"] as string[] },
    { msg: "新古車有嗎",         intents: ["new_car_question"] as string[] },
  ];
  liveBugInputs.forEach(({ msg, intents }) => {
    it(`'${msg}' after Toyota history → Toyota NOT in LLM context`, () => {
      const history = [
        ...staleToyotaHistory.slice(0, -1),
        { role: "user", content: msg },
      ];
      const ctx = makePromptContext(
        msg,
        { type: "none", vehicle: null, questionType: "general", directAnswer: "", termExplanation: "" },
        intents,
      );
      const messages = buildLLMMessages(ctx, history);
      const nonSystemNonLast = messages
        .filter(m => m.role !== "system")
        .slice(0, -1)
        .map(m => m.content)
        .join(" ");
      expect(nonSystemNonLast).not.toContain("Toyota");
      expect(nonSystemNonLast).not.toContain("Corolla");
    });
  });
});

// ============================================================
// Part 5: Gaps left open (TESTER-FLAGs)
// Documented here so reviewers see what the current fix does NOT cover.
// ============================================================

describe("TESTER-FLAG: known gaps (documented, NOT fixed)", () => {
  it("TESTER-FLAG: '新不新的' is semantically ambiguous (condition vs inventory type) — defers to handler", () => {
    // "新不新的" could mean either "is it new?" (asking condition) or "do you
    // have new ones or not?" (asking inventory). We deliberately do NOT
    // trigger new_car_question here — the bare 新不新 pattern would also
    // catch "這台新不新" (condition) which is a false positive. Leave to LLM.
    const intents = detectCustomerIntents("新不新的");
    expect(intents).not.toContain("new_car_question");
  });

  it("TESTER-FLAG: benign '找你們' does NOT clear stale history", () => {
    // "找你們" fires NO intent (no address/phone/hours/new-car match).
    // If there's stale Toyota history, it stays. Risk is low — the message
    // is so vague the LLM will likely ask for clarification.
    const intents = detectCustomerIntents("找你們");
    expect(intents.length).toBe(0);
    // Documented gap — fix would require a separate "ambiguous greeting"
    // intent that also clears history.
  });

  it("TESTER-FLAG: '看車方便嗎' fires no intent; history preserved", () => {
    // "看車方便嗎" is likely a legitimate follow-up asking about visit
    // convenience, so preserving history is arguably CORRECT. Flagged in
    // case product decides otherwise.
    const intents = detectCustomerIntents("看車方便嗎");
    expect(intents).not.toContain("address");
    expect(intents).not.toContain("hours");
  });

  it("TESTER-FLAG: TOCTOU — message arriving mid-LLM-call cannot retroactively clear history", () => {
    // shouldClearHistoryForFreshTopic runs synchronously before the LLM
    // call. If a new vehicle-context message arrives while the LLM is
    // still generating for a cleared-history call, the LLM's reply will
    // already ignore the new context. Acceptable per primer.md note on
    // existing 1-5s TOCTOU window.
    expect(true).toBe(true);
  });
});
