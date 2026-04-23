/**
 * Fact-Lock Regression Tests
 *
 * Protects against the 2026-04-23 Mufasa conversation bugs where the LLM:
 *   1. Quoted 98.9萬 for a car that costs 80.9萬 (leaked newCarPrice / hallucinated MSRP)
 *   2. Called a used car "新車" (wrong dealership type)
 *   3. Claimed the shop is in 台北內湖 (actual shop is 高雄三民)
 *
 * These tests assert:
 *   - validateLLMOutput BLOCKS (returns safe=false) — not just logs — on any of these
 *   - The FORBIDDEN_LOCATIONS / FORBIDDEN_DEALERSHIP_TERMS / LEAKY_FIELD_NAMES
 *     lists catch the real-world phrasings the LLM used
 *   - formatVehiclePriceSafe never returns "undefined萬" / "null萬"
 *   - shopConfig constants are a single source of truth (no divergence)
 *
 * Related: docs/PROJECT_JOURNAL.md — 2026-04-23 entry.
 */

import { describe, it, expect } from "vitest";
import { validateLLMOutput } from "./security";
import { formatVehiclePriceSafe } from "./ruleBasedReply";
import {
  SHOP_ADDRESS,
  SHOP_ADDRESS_PLAIN,
  SHOP_CITY,
  SHOP_DISTRICT,
  SHOP_PHONE,
  FORBIDDEN_LOCATIONS,
  FORBIDDEN_DEALERSHIP_TERMS,
  LEAKY_FIELD_NAMES,
} from "../shared/shopConfig";

// ============================================================
// SECTION 1: shopConfig consistency (single source of truth)
// ============================================================

describe("shopConfig — single source of truth", () => {
  it("SHOP_ADDRESS contains SHOP_CITY and SHOP_DISTRICT", () => {
    // Catches the class of bug where lineWebhook.ts:974 said
    // "高雄市鳳山區..." while ruleBasedReply.ts said "高雄市三民區...".
    // Any future divergence of district or city would fail here.
    expect(SHOP_ADDRESS).toContain(SHOP_CITY);
    expect(SHOP_ADDRESS).toContain(SHOP_DISTRICT);
    expect(SHOP_ADDRESS_PLAIN).toContain(SHOP_CITY);
    expect(SHOP_ADDRESS_PLAIN).toContain(SHOP_DISTRICT);
  });

  it("SHOP_ADDRESS and SHOP_ADDRESS_PLAIN differ only by the landmark tail", () => {
    // The plain version is used in schema.org contexts; the human version
    // has "（肯德基斜對面）" tacked on. If anyone edits one and not the other,
    // the core address portion must still match.
    expect(SHOP_ADDRESS.startsWith(SHOP_ADDRESS_PLAIN)).toBe(true);
  });

  it("SHOP_CITY must be 高雄 (not 台北 / 台中 / anything else)", () => {
    // Regression lock — if someone ever changes SHOP_CITY to the wrong
    // city, every other forbidden-location test would spuriously pass.
    expect(SHOP_CITY).toBe("高雄");
  });

  it("SHOP_PHONE is a valid Taiwan mobile number format", () => {
    // 09XX-XXX-XXX with hyphens is our storage format.
    expect(SHOP_PHONE).toMatch(/^09\d{2}-\d{3}-\d{3}$/);
  });

  it("FORBIDDEN_LOCATIONS must include 台北 and 內湖 (real-incident trigger)", () => {
    // The 2026-04-23 incident had the LLM say "我們在台北內湖".
    // If these two were ever removed, the regression wouldn't be caught.
    expect(FORBIDDEN_LOCATIONS).toContain("台北");
    expect(FORBIDDEN_LOCATIONS).toContain("內湖");
  });

  it("FORBIDDEN_LOCATIONS must NOT include SHOP_CITY (that would block our own location)", () => {
    // Sanity check: if someone added "高雄" to the forbidden list, every
    // legitimate address reply would be blocked.
    expect(FORBIDDEN_LOCATIONS).not.toContain(SHOP_CITY);
  });

  it("FORBIDDEN_DEALERSHIP_TERMS must include 新車價 (real-incident trigger)", () => {
    expect(FORBIDDEN_DEALERSHIP_TERMS).toContain("新車價");
  });

  it("LEAKY_FIELD_NAMES must include newCarPrice (source of the 98.9萬 bug)", () => {
    expect(LEAKY_FIELD_NAMES).toContain("newCarPrice");
  });
});

// ============================================================
// SECTION 2: validateLLMOutput — forbidden location claims
// ============================================================

describe("validateLLMOutput — forbidden location claims", () => {
  it("BLOCKS the exact phrase from the 2026-04-23 incident", () => {
    // Live bug: customer asked "再高雄嗎" and AI replied this. The fact
    // we claimed 台北內湖 in front of a real buyer is the reason this whole
    // test file exists.
    const r = validateLLMOutput("老闆我們在台北內湖喔");
    expect(r.safe).toBe(false);
    expect(r.violations.some(v => v.startsWith("forbidden_location:"))).toBe(true);
  });

  it("BLOCKS '我們位於台中' variant", () => {
    const r = validateLLMOutput("我們位於台中市，歡迎來看車");
    expect(r.safe).toBe(false);
    expect(r.violations.some(v => v.startsWith("forbidden_location:"))).toBe(true);
  });

  it("BLOCKS '崑家汽車在新北' variant", () => {
    const r = validateLLMOutput("崑家汽車在新北市，地址稍後提供");
    expect(r.safe).toBe(false);
    expect(r.violations.some(v => v.startsWith("forbidden_location:"))).toBe(true);
  });

  it("BLOCKS '地址在信義區' variant", () => {
    const r = validateLLMOutput("我們的地址在信義區附近");
    expect(r.safe).toBe(false);
    expect(r.violations.some(v => v.startsWith("forbidden_location:"))).toBe(true);
  });

  it("DOES NOT block legitimate mentions of customer origin ('從台北過來歡迎')", () => {
    // A customer saying "I'm from Taipei" and the AI saying "從台北過來歡迎"
    // is fine — there's no "我們在..." pattern. False positive check.
    const r = validateLLMOutput("謝謝你從台北過來歡迎到店看車");
    expect(r.violations.some(v => v.startsWith("forbidden_location:"))).toBe(false);
  });

  it("DOES NOT block correcting phrases ('我們在高雄不是台北')", () => {
    // If the AI explicitly corrects itself ("we're in Kaohsiung NOT Taipei"),
    // the "高雄" presence suppresses the false positive.
    const r = validateLLMOutput("我們在高雄不是台北，歡迎南下看車");
    expect(r.violations.some(v => v.startsWith("forbidden_location:"))).toBe(false);
  });

  it("BLOCKS every entry in FORBIDDEN_LOCATIONS", () => {
    // Coverage guarantee: every single forbidden location must be caught
    // when used in a "我們在X" pattern.
    for (const loc of FORBIDDEN_LOCATIONS) {
      const r = validateLLMOutput(`我們在${loc}歡迎來店`);
      expect(
        r.violations.some(v => v.startsWith("forbidden_location:") && v.includes(loc)),
        `FORBIDDEN_LOCATIONS entry "${loc}" was not caught by the validator`,
      ).toBe(true);
    }
  });
});

// ============================================================
// SECTION 3: validateLLMOutput — forbidden dealership terms
// ============================================================

describe("validateLLMOutput — forbidden dealership terms", () => {
  it("BLOCKS the exact phrase from the 2026-04-23 incident", () => {
    const r = validateLLMOutput("Mufasa 2.0 GLC旗艦版是新車價格很硬沒什麼空間喔");
    expect(r.safe).toBe(false);
    expect(r.violations.some(v => v.startsWith("forbidden_dealership_term:"))).toBe(true);
  });

  it("BLOCKS '新車價' variant", () => {
    const r = validateLLMOutput("這台的新車價要98萬左右");
    expect(r.safe).toBe(false);
    expect(r.violations.some(v => v.startsWith("forbidden_dealership_term:"))).toBe(true);
  });

  it("BLOCKS '原廠新車' variant", () => {
    const r = validateLLMOutput("這是原廠新車，沒有殺價空間");
    expect(r.safe).toBe(false);
    expect(r.violations.some(v => v.startsWith("forbidden_dealership_term:"))).toBe(true);
  });

  it("BLOCKS '我們賣新車' variant", () => {
    const r = validateLLMOutput("不好意思，我們賣新車沒有中古");
    expect(r.safe).toBe(false);
    expect(r.violations.some(v => v.startsWith("forbidden_dealership_term:"))).toBe(true);
  });

  it("DOES NOT block legitimate 中古車 self-descriptions", () => {
    // Saying "we are a 中古車行" is exactly correct.
    const r = validateLLMOutput("我們是中古車行，賣的都是精選二手車");
    expect(r.violations.some(v => v.startsWith("forbidden_dealership_term:"))).toBe(false);
  });

  it("DOES NOT block standalone '車' / '新' words", () => {
    // Substring protection sanity check — "新" alone or "新車款" (new model)
    // as a feature description is common and fine.
    const r = validateLLMOutput("這台很新，外觀像剛出廠一樣");
    expect(r.violations.some(v => v.startsWith("forbidden_dealership_term:"))).toBe(false);
  });
});

// ============================================================
// SECTION 4: validateLLMOutput — price mismatch (upgraded to critical)
// ============================================================

describe("validateLLMOutput — price mismatch", () => {
  const inventoryPrices = ["80.9", "80.9萬", "55", "55萬", "120", "120萬"];
  const inventory = ["Mercedes Mufasa", "Mazda CX-5", "BMW X1"];

  it("BLOCKS the exact mismatch from the 2026-04-23 incident (98.9萬)", () => {
    // AI said "售價98.9萬" when real price was 80.9萬. newCarPrice of the
    // GLC is ~98.9萬 MSRP — that's where the number came from.
    const r = validateLLMOutput("老闆Mufasa 2.0 GLC旗艦版售價98.9萬", {
      allowedPrices: inventoryPrices,
      inventory,
    });
    expect(r.safe).toBe(false);
    expect(r.violations.some(v => v.startsWith("price_not_in_inventory:"))).toBe(true);
  });

  it("DOES NOT block the correct price (80.9萬)", () => {
    const r = validateLLMOutput("老闆Mufasa售價80.9萬", {
      allowedPrices: inventoryPrices,
      inventory,
    });
    expect(r.violations.some(v => v.startsWith("price_not_in_inventory:"))).toBe(false);
  });

  it("BLOCKS any price not in inventory when allowedPrices is provided", () => {
    const r = validateLLMOutput("這台 CX-5 大概 45萬", {
      allowedPrices: inventoryPrices,
      inventory,
    });
    expect(r.safe).toBe(false);
    expect(r.violations.some(v => v.startsWith("price_not_in_inventory:"))).toBe(true);
  });

  it("SKIPS price validation when allowedPrices is not provided", () => {
    // Before the inventory is loaded, we don't have a reference to check against.
    // Validator should not false-positive on every price mention.
    const r = validateLLMOutput("大概45萬左右", {});
    expect(r.violations.some(v => v.startsWith("price_not_in_inventory:"))).toBe(false);
  });
});

// ============================================================
// SECTION 5: validateLLMOutput — leaked backend field names
// ============================================================

describe("validateLLMOutput — leaked backend field names", () => {
  it("BLOCKS 'newCarPrice' appearing in user-facing text", () => {
    // This indicates the vehicle KB was serialized with raw DB field names,
    // which is the upstream source of the 98.9萬 hallucination.
    const r = validateLLMOutput("這台 Mufasa 的 newCarPrice 是 98.9");
    expect(r.safe).toBe(false);
    expect(r.violations.some(v => v.startsWith("leaked_field_name:"))).toBe(true);
  });

  it("BLOCKS 'newCarMsrp' appearing in user-facing text", () => {
    const r = validateLLMOutput("newCarMsrp: 98.9萬");
    expect(r.safe).toBe(false);
    expect(r.violations.some(v => v.startsWith("leaked_field_name:"))).toBe(true);
  });

  it("DOES NOT block normal Chinese text that happens to mention 'price' in English", () => {
    // Common dev-adjacent words shouldn't false-positive. The leak list is
    // deliberately narrow (actual DB field names) — not "price" or "msrp" alone.
    const r = validateLLMOutput("this price is only a rough estimate");
    expect(r.violations.some(v => v.startsWith("leaked_field_name:"))).toBe(false);
  });
});

// ============================================================
// SECTION 6: Compound violations — the full Mufasa reply
// ============================================================

describe("validateLLMOutput — compound fact violations (the Mufasa incident)", () => {
  it("catches ALL THREE violations in the exact bad reply simultaneously", () => {
    // The actual bad reply from the screenshot said things like:
    //   "老闆Mufasa 2.0 GLC旗艦版售價98.9萬 ... 是新車價格很硬 ... 我們在台北內湖"
    // A single validator pass must flag price + dealership_term + location.
    const badReply =
      "老闆Mufasa 2.0 GLC旗艦版售價98.9萬，" +
      "這台是新車價格很硬沒什麼空間。" +
      "我們在台北內湖歡迎來店";
    const r = validateLLMOutput(badReply, {
      allowedPrices: ["80.9", "80.9萬"],
      inventory: ["Mercedes Mufasa"],
    });
    expect(r.safe).toBe(false);
    expect(r.violations.some(v => v.startsWith("price_not_in_inventory:"))).toBe(true);
    expect(r.violations.some(v => v.startsWith("forbidden_dealership_term:"))).toBe(true);
    expect(r.violations.some(v => v.startsWith("forbidden_location:"))).toBe(true);
  });

  it("a clean, correct reply is still safe", () => {
    // Sanity check the happy path — if this ever fails, we've over-tightened.
    const goodReply =
      "老闆Mufasa 2.0 GLC旗艦版售價80.9萬，" +
      "這台車況很不錯，想不想約個時間來我們高雄三民的店裡看實車？";
    const r = validateLLMOutput(goodReply, {
      allowedPrices: ["80.9", "80.9萬"],
      inventory: ["Mercedes Mufasa"],
    });
    expect(r.safe).toBe(true);
    // Violations array may be empty or only contain non-critical items.
    expect(
      r.violations.filter(
        v =>
          v.startsWith("price_not_in_inventory:") ||
          v.startsWith("forbidden_dealership_term:") ||
          v.startsWith("forbidden_location:") ||
          v.startsWith("leaked_field_name:"),
      ),
    ).toEqual([]);
  });
});

// ============================================================
// SECTION 7: Adversarial — location-regex evasion attempts
// ============================================================
// These are the phrasings a creative LLM might use that SLIPPED PAST
// the original 4 patterns during an adversarial audit on 2026-04-23.
// Every one of these must now block. If any one of them regresses to
// "safe: true", the location guardrail has been weakened.

describe("validateLLMOutput — adversarial location evasions", () => {
  const cases: { label: string; input: string; expected: string }[] = [
    // Alternative verbs the original regex didn't cover
    { label: "身處 (not in original pattern list)", input: "我們身處台北市歡迎來店", expected: "台北" },
    { label: "坐落於 bare (was missing in base pattern)", input: "我們坐落於信義區", expected: "信義區" },
    { label: "地址位於 (not covered — only 地址是/在)", input: "我們的地址位於新北市", expected: "新北" },
    { label: "地址設在", input: "我們的地址設在台中七期", expected: "台中" },

    // Punctuation between verb and location (bypass via separator)
    { label: "comma between 在 and location", input: "我們在，台北內湖", expected: "台北" },
    { label: "chinese full-stop between", input: "我們位於。台中市", expected: "台中" },
    { label: "的 particle between", input: "我們在的台北分店", expected: "台北" },

    // Alternative subjects
    { label: "本店 subject", input: "本店在台北內湖", expected: "台北" },
    { label: "本公司 subject", input: "本公司位於新竹", expected: "新竹" },
    { label: "我司 subject", input: "我司在台北", expected: "台北" },
    { label: "門市 subject", input: "門市在台中七期", expected: "台中" },
    { label: "分店 subject", input: "分店在桃園中壢", expected: "桃園" },
    { label: "總店 subject", input: "總店在台中", expected: "台中" },
    { label: "展示中心 subject", input: "展示中心位於新北", expected: "新北" },
    { label: "據點 subject", input: "據點在嘉義", expected: "嘉義" },

    // 崑家 prefix with extended verbs (original only had 在/位於/開/設/來自)
    { label: "崑家坐落於", input: "崑家坐落於台北內湖", expected: "台北" },
    { label: "崑家身處", input: "崑家身處內湖", expected: "內湖" },
    { label: "崑家汽車地址位於", input: "崑家汽車地址位於台中", expected: "台中" },
  ];

  for (const { label, input, expected } of cases) {
    it(`BLOCKS evasion: ${label}`, () => {
      const r = validateLLMOutput(input);
      expect(
        r.violations.some(v => v.startsWith("forbidden_location:") && v.includes(expected)),
        `Input "${input}" should trigger forbidden_location:${expected} but violations were: ${r.violations.join(", ") || "(none)"}`,
      ).toBe(true);
      expect(r.safe).toBe(false);
    });
  }
});

// ============================================================
// SECTION 8: Adversarial — false-positive guardrail (legit outputs stay clean)
// ============================================================
// If the AI says these things, they are legitimate and must NOT be blocked.
// Every entry here is a phrasing a careful human would write.

describe("validateLLMOutput — false-positive safety", () => {
  const safeReplies: { label: string; input: string }[] = [
    { label: "customer origin (from Taipei welcome)", input: "謝謝你從台北過來歡迎到店看車" },
    { label: "customer lives in Taipei echo", input: "你住台北是吧，我們在高雄，高鐵左營站下車很方便" },
    { label: "explicit correction (we are in 高雄, not 台北)", input: "我們在高雄不是台北，歡迎南下看車" },
    { label: "explicit correction variant 2", input: "老闆我們在高雄三民區不是內湖喔" },
    { label: "new model (新車款) legitimate", input: "這台新車款剛改款外型很不錯" },
    { label: "new owner (新車主) legitimate", input: "歡迎新車主一起開車兜風" },
    { label: "new type (新車型) legitimate", input: "這款新車型很受歡迎" },
    { label: "condition is like new (全新)", input: "這台車況幾乎全新，外觀像剛出廠" },
    { label: "mentions 新 in other context", input: "這台很新，外觀像剛出廠一樣" },
    { label: "customer asking about Taipei branches (rhetorical)", input: "你們台北有分店嗎？我們只有高雄一間店" },
    { label: "legitimate used-car self-description", input: "我們是中古車行，只賣精選二手車" },
    { label: "legit shop address with SHOP_CITY", input: "我們在高雄三民區大順二路269號，歡迎來店看車" },
  ];

  for (const { label, input } of safeReplies) {
    it(`does NOT block: ${label}`, () => {
      const r = validateLLMOutput(input);
      expect(
        r.violations.some(
          v =>
            v.startsWith("forbidden_location:") ||
            v.startsWith("forbidden_dealership_term:"),
        ),
        `Safe input "${input}" was wrongly flagged: ${r.violations.join(", ")}`,
      ).toBe(false);
      expect(r.safe).toBe(true);
    });
  }
});

// ============================================================
// SECTION 9: Adversarial — Chinese MSRP-label leakage
// ============================================================
// LEAKY_FIELD_NAMES only caught English identifiers ("newCarPrice") but
// Gemini has output Chinese labels like "新車原價"/"新車牌價"/"市場行情"
// that act as functional leaks of MSRP. Added to FORBIDDEN_DEALERSHIP_TERMS.

describe("validateLLMOutput — Chinese MSRP-label leakage", () => {
  const cases: { label: string; input: string; term: string }[] = [
    { label: "新車原價 label", input: "新車原價98.9萬，我們售80.9萬", term: "新車原價" },
    { label: "新車牌價 label", input: "這台新車牌價是98.9萬", term: "新車牌價" },
    { label: "新車市價 label", input: "新車市價 98.9萬，我們賣 80.9萬", term: "新車市價" },
    { label: "市場行情 proxy", input: "這台市場行情大概98萬", term: "市場行情" },
  ];

  for (const { label, input, term } of cases) {
    it(`BLOCKS Chinese MSRP leakage: ${label}`, () => {
      const r = validateLLMOutput(input);
      expect(
        r.violations.some(v => v.startsWith("forbidden_dealership_term:") && v.includes(term)),
        `Input "${input}" should have been flagged for ${term}, got: ${r.violations.join(", ")}`,
      ).toBe(true);
      expect(r.safe).toBe(false);
    });
  }
});

// ============================================================
// SECTION 10: Adversarial — compound attack (price + MSRP-label + correct price)
// ============================================================

describe("validateLLMOutput — compound attack resilience", () => {
  it("BLOCKS '新車市價 98.9萬，我們賣 80.9萬 只是參考' (MSRP-leak compound)", () => {
    // This is the subtlest attack: AI mentions the MSRP, then quotes the
    // correct price, and tries to play it off as "just a reference". Must
    // block on both price_not_in_inventory (98.9萬) AND
    // forbidden_dealership_term (新車市價).
    const r = validateLLMOutput("新車市價 98.9萬，我們賣 80.9萬 只是參考", {
      allowedPrices: ["80.9", "80.9萬"],
      inventory: ["Mercedes Mufasa"],
    });
    expect(r.safe).toBe(false);
    expect(r.violations.some(v => v.startsWith("price_not_in_inventory:"))).toBe(true);
    expect(r.violations.some(v => v.startsWith("forbidden_dealership_term:"))).toBe(true);
  });

  it("BLOCKS '老闆我們在台北內湖，Mufasa 新車市價98.9萬，這是新車喔' (triple compound)", () => {
    // Location + MSRP leak + dealership claim in one reply.
    const r = validateLLMOutput("老闆我們在台北內湖，Mufasa 新車市價98.9萬，這是新車喔", {
      allowedPrices: ["80.9", "80.9萬"],
      inventory: ["Mercedes Mufasa"],
    });
    expect(r.safe).toBe(false);
    expect(r.violations.some(v => v.startsWith("forbidden_location:"))).toBe(true);
    expect(r.violations.some(v => v.startsWith("forbidden_dealership_term:"))).toBe(true);
    expect(r.violations.some(v => v.startsWith("price_not_in_inventory:"))).toBe(true);
  });
});

// ============================================================
// SECTION 11: formatVehiclePriceSafe — edge cases
// ============================================================
// The 2026-04-23 audit found 4 call sites using the unsafe `v.priceDisplay
// || \`${v.price}萬\`` pattern that produced "undefined萬". This set of
// tests pins down every degenerate shape a vehicle row can take.

describe("formatVehiclePriceSafe — edge cases", () => {
  it("returns priceDisplay when it's a non-empty string", () => {
    expect(formatVehiclePriceSafe({ priceDisplay: "80.9萬", price: 80.9 })).toBe("80.9萬");
  });

  it("trims whitespace from priceDisplay", () => {
    expect(formatVehiclePriceSafe({ priceDisplay: "  80.9萬  ", price: 80.9 })).toBe("80.9萬");
  });

  it("falls back to price when priceDisplay is empty string", () => {
    expect(formatVehiclePriceSafe({ priceDisplay: "", price: 80.9 })).toBe("80.9萬");
  });

  it("falls back to price when priceDisplay is whitespace only", () => {
    expect(formatVehiclePriceSafe({ priceDisplay: "   ", price: 80.9 })).toBe("80.9萬");
  });

  it("handles string price by coercing to number", () => {
    // MySQL decimals often come back as strings ("80.9") via Drizzle
    expect(formatVehiclePriceSafe({ priceDisplay: null, price: "80.9" })).toBe("80.9萬");
  });

  it("falls back to handoff message when price is 0 (sold car)", () => {
    expect(formatVehiclePriceSafe({ priceDisplay: null, price: 0 })).toBe(
      `價格請電聯 ${SHOP_PHONE} 確認`,
    );
  });

  it("falls back to handoff when price is negative (bug data)", () => {
    expect(formatVehiclePriceSafe({ priceDisplay: null, price: -5 })).toBe(
      `價格請電聯 ${SHOP_PHONE} 確認`,
    );
  });

  it("falls back to handoff when both fields are null", () => {
    expect(formatVehiclePriceSafe({ priceDisplay: null, price: null })).toBe(
      `價格請電聯 ${SHOP_PHONE} 確認`,
    );
  });

  it("falls back to handoff when price is the string 'undefined' (data rot)", () => {
    expect(formatVehiclePriceSafe({ priceDisplay: null, price: "undefined" })).toBe(
      `價格請電聯 ${SHOP_PHONE} 確認`,
    );
  });

  it("falls back to handoff when object is empty", () => {
    expect(formatVehiclePriceSafe({})).toBe(`價格請電聯 ${SHOP_PHONE} 確認`);
  });

  it("falls back to handoff when object is null", () => {
    expect(formatVehiclePriceSafe(null)).toBe(`價格請電聯 ${SHOP_PHONE} 確認`);
  });

  it("never returns the literal string 'undefined萬' or 'null萬' under ANY input", () => {
    // Smoke sweep — the regression that started all this.
    const shapes = [
      { priceDisplay: undefined, price: undefined },
      { priceDisplay: null, price: null },
      { priceDisplay: "", price: "" },
      { priceDisplay: "   ", price: NaN },
      { priceDisplay: null, price: "abc" },
      {},
      null,
      undefined,
    ];
    for (const s of shapes) {
      const out = formatVehiclePriceSafe(s);
      expect(out).not.toContain("undefined");
      expect(out).not.toContain("null");
      expect(out).not.toContain("NaN");
    }
  });
});

// ============================================================
// SECTION 12: Coverage — every FORBIDDEN_DEALERSHIP_TERM in a plain sentence
// ============================================================

describe("FORBIDDEN_DEALERSHIP_TERMS coverage — every entry is caught", () => {
  for (const term of FORBIDDEN_DEALERSHIP_TERMS) {
    it(`BLOCKS a plain sentence containing "${term}"`, () => {
      const r = validateLLMOutput(`這台車${term}很不錯`);
      expect(
        r.violations.some(v => v.startsWith("forbidden_dealership_term:") && v.includes(term)),
        `FORBIDDEN_DEALERSHIP_TERMS entry "${term}" was not caught`,
      ).toBe(true);
    });
  }
});

// ============================================================
// SECTION 13: Reviewer regression tests (2026-04-23)
// Added after the reviewer subagent pass. Each test here locks in a
// specific edge case the reviewer flagged — if someone regresses any
// of these, the test name points straight at the relevant review finding.
// ============================================================

describe("reviewer regressions — M1: price validator accepts both shape variants", () => {
  it("accepts correct 80.9萬 reply when inventory has only numeric price (no priceDisplay)", () => {
    // Reviewer M1: when v.priceDisplay is null but v.price=80.9, callers now
    // push BOTH "80.9" AND "80.9萬" to allowedPrices. The LLM replies in 萬
    // notation, which should match the 萬-shape entry.
    const r = validateLLMOutput("這台售價80.9萬", {
      allowedPrices: ["80.9", "80.9萬"], // both shapes pushed, per fix
    });
    expect(r.violations.some(v => v.startsWith("price_not_in_inventory:"))).toBe(false);
  });

  it("still blocks when only the numeric shape is pushed but LLM quotes 萬 (pre-fix behavior)", () => {
    // Locks in the fact that WITHOUT the fix, the validator would flag a
    // correct price. This test documents WHY the fix is necessary.
    const r = validateLLMOutput("這台售價80.9萬", {
      allowedPrices: ["80.9"], // only numeric — this is what pre-fix callers pushed
    });
    expect(r.safe).toBe(false);
    expect(r.violations.some(v => v.startsWith("price_not_in_inventory:80.9萬"))).toBe(true);
  });
});

describe("reviewer regressions — M2: correction-phrase suppressor (reverse word order)", () => {
  it("DOES block 'we are in Taipei NOT Kaohsiung' reverse-order variant", () => {
    // Reviewer M2: the suppressor looks for SHOP_CITY inside the same capture
    // group as the forbidden location. For "我們位於台北，不是高雄" the regex
    // stops capturing at the comma BEFORE 高雄, so the suppressor doesn't
    // fire and the claim IS correctly blocked. This test locks in that
    // intended behavior — a forward-order correction ("高雄不是台北") is
    // suppressed (legit), but reverse-order ("台北...不是高雄") is NOT
    // suppressed because it's linguistically ambiguous.
    const r = validateLLMOutput("我們位於台北，不是高雄，請留意");
    expect(r.safe).toBe(false);
    expect(r.violations.some(v => v.startsWith("forbidden_location:台北"))).toBe(true);
  });

  it("DOES NOT block forward-order correction 'we are in Kaohsiung NOT Taipei'", () => {
    // The simple, unambiguous correction form — SHOP_CITY in the capture
    // group with the forbidden location should be suppressed.
    const r = validateLLMOutput("我們在高雄不是台北，歡迎南下");
    expect(r.violations.some(v => v.startsWith("forbidden_location:"))).toBe(false);
  });
});

describe("reviewer regressions — MIN3: price validator handles empty allowedPrices array", () => {
  it("SKIPS price validation when allowedPrices is an empty array (not just missing)", () => {
    // Reviewer MIN3: the existing test used `{}` (absent key), not `[]`
    // (empty key). Ensure the `length > 0` guard works for both shapes.
    const r = validateLLMOutput("大概45萬左右", { allowedPrices: [] });
    expect(r.violations.some(v => v.startsWith("price_not_in_inventory:"))).toBe(false);
  });
});
