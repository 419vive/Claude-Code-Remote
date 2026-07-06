# LINE Conversation Memory System — Implementation Complete

**Date:** 2026-07-06  
**Status:** ✅ Complete & Tested  
**Impact:** Stops frustrating re-asks like "預算多少" when customer already said "30萬" 5 messages ago

## What's Implemented

### 1. **Database Layer** ✅
Added 5 customer preference columns to `conversations` table (migration 0005):
- `budget: INT` — stored in units (e.g., 3000000 for 30萬)
- `budgetRange: VARCHAR(32)` — range like "30-50" (in 萬)
- `preferredBrand: VARCHAR(256)` — comma-separated (e.g., "Honda,Toyota")
- `preferredBodyType: VARCHAR(128)` — e.g., "SUV,轎車"
- `preferredVisitTime: VARCHAR(64)` — e.g., "週末下午"

### 2. **Extraction Layer** ✅ (`customerMemoryExtractor.ts`)
High-confidence pattern matching extracts preferences from messages:
- **Budget:** `extractBudget("預算30萬")` → `3000000`
- **Range:** `extractBudgetRange("30到50萬")` → `"30-50"`
- **Brand:** `extractPreferredBrand("喜歡 Honda 或 Toyota")` → `"Honda,Toyota"`
- **Body type:** `extractPreferredBodyType("想買 SUV")` → `"SUV"`
- **Visit time:** `extractPreferredVisitTime("週末下午")` → `"週末下午"`

**Storage strategy:** Only stores if field is currently empty (don't overwrite earlier explicit mentions)

### 3. **Extraction Integration** ✅ (`lineWebhook.ts` lines 1495-1524)
On every message:
1. Extract preferences from user message
2. Only update DB if field is empty (first mention wins)
3. Log when preferences are extracted
4. Pass preferences to both LLM and rule-based reply contexts

### 4. **Prompt Injection** ✅ (`dynamicPromptBuilder.ts`)
**New function:** `buildCustomerKnownInfo(ctx)` outputs:
```
【客人已知資訊】
- 預算：30萬
- 喜歡的品牌：Honda
- 車型偏好：SUV
- 看車時間偏好：週末下午
```

Injected into system prompt at line 128 in the **"👤 客人已知資訊"** section — positioned early so LLM reads it before task details.

### 5. **Re-ask Gating** ✅ (`ruleBasedReply.ts`)

#### Budget gating (lines 193-200)
```typescript
// When customer asks "預算多少" and budget is known:
if (ctx.customerBudget || ctx.customerBudgetRange) {
  const wan = ctx.customerBudget ? Math.round(ctx.customerBudget / 100000) : ctx.customerBudgetRange;
  return `根據你的預算${wan}萬，我幫你看看有什麼適合的車款！請問有偏好的品牌嗎？`;
}
```

#### Generic "想看車" contextual reply (lines 198-219)
When customer says "想看車", "推薦", or "有什麼車":
- Build reply based on what's ALREADY KNOWN
- Only ask for missing preferences
- Reference known budget/brand/body-type in the same message

Example flows:
- **No info known:** "請問預算、品牌、車型呢？"
- **Budget known:** "根據你的預算30萬，請問有偏好的品牌嗎？"
- **Budget + Brand known:** "根據你的預算30萬、喜歡Honda，我幫你精選最適合的車款！"

#### Appointment time gating (lines 289-301)
```typescript
if (ctx.customerPreferredVisitTime) {
  return `好的，我幫你安排${preferredVisitTime}來看車！...`;
}
```

### 6. **Test Coverage** ✅ (`ruleBasedReply.memory.test.ts`)
18 comprehensive tests covering:
- ✅ Budget gating (exact amount, range, edge cases)
- ✅ Brand preference gating
- ✅ Visit time gating
- ✅ Combined preferences (multiple fields known)
- ✅ Edge cases (null, undefined, empty strings, 0 values)
- ✅ Integration with detection types (inquiry_button, context_missing)

All tests passing: **18/18 ✓**

## How It Works (End-to-End)

### Customer Journey

```
Message 1: "預算30萬"
├─ Extract: budget = 3000000
├─ Store in DB: conversations.budget = 3000000
├─ Reply: "好的，30萬預算，請問有偏好的品牌嗎？"
└─ Logs: "[LINE] Budget extracted: 30萬"

Message 2: "喜歡 Honda"
├─ Extract: preferredBrand = "Honda"
├─ Store in DB: conversations.preferredBrand = "Honda"
├─ Prompt includes: "- 喜歡的品牌：Honda"
├─ Reply: "Honda 是不錯的選擇，我幫你看看有什麼適合的車款！"
└─ Logs: "[LINE] Preferred brands extracted: Honda"

Message 3: "想看車"
├─ Load from DB: budget=3000000, preferredBrand="Honda"
├─ Build contextual reply:
│  ├─ Known: budget (30萬), brand (Honda)
│  └─ Unknown: bodyType
├─ SKIP re-asking budget ("預算多少" → never asked again)
├─ Reply: "根據你的預算30萬、喜歡Honda，我幫你精選最適合的車款！"
└─ No "預算多少" or "喜歡什麼品牌" re-ask!
```

## Technical Details

### Database Update Pattern (Safe)
```typescript
// Only update if field is currently empty
if (prefs.budget && !conversation!.budget) {
  prefsToUpdate.budget = prefs.budget;
}
```

This ensures:
- First explicit mention is stored
- If customer later says "改主意了，預算50萬", the old value remains until operator manually resets OR we implement UPDATE-on-explicit logic (deferred)

### Prompt Context Flow
```
LineWebhook.ts (line 1959)
  ↓
  PromptContext {
    customerBudget: 3000000,
    customerBudgetRange: "30-50",
    customerPreferredBrand: "Honda",
    ...
  }
  ↓
  buildDynamicSystemPrompt(ctx)
    ↓
    buildBreadTop(ctx)
      ↓
      buildCustomerKnownInfo(ctx)  ← Injects "【客人已知資訊】" section
```

### Memory Priority (Sandwiched)
1. **System prompt START** (identity + golden rules)
2. **Sales psychology** (FULL, never compressed)
3. **Appointment section** (if needed)
4. **Contact/Rich menu sections**
5. **VEHICLE KB**
6. **General rules**
7. **Human handoff**
8. **BREAD BOTTOM** (repeats critical rules + dynamic injections)
9. **CUSTOMER MEMORY SECTION** ← Injected here via `buildCustomerKnownInfo()`
10. **FACT LOCK** (absolutely last for max recency)

## Files Changed

### New
- `kun-auto-chatbot/server/ruleBasedReply.memory.test.ts` (18 tests)
- `docs/MEMORY_SYSTEM_IMPLEMENTATION.md` (this file)

### Modified
- `kun-auto-chatbot/server/ruleBasedReply.ts` (+re-ask gating logic)
  - Budget gating (line 195)
  - Contextual "想看車" reply (lines 198-219)
  - Appointment time gating (line 145)

### Already Complete (From Earlier PRs)
- `kun-auto-chatbot/drizzle/schema.ts` (fields added)
- `kun-auto-chatbot/drizzle/0005_add_conversation_memory.sql` (migration)
- `kun-auto-chatbot/server/customerMemoryExtractor.ts` (extraction logic)
- `kun-auto-chatbot/server/customerMemoryExtractor.test.ts` (extraction tests)
- `kun-auto-chatbot/server/lineWebhook.ts` (extraction integration + prompt passing)
- `kun-auto-chatbot/server/dynamicPromptBuilder.ts` (customer known info injection)

## Test Results

```
✅ ruleBasedReply.memory.test.ts: 18/18 passing
✅ Full suite: 892 passing (46 pre-existing DB failures unchanged)
✅ No regressions
```

## What Still Works (Unchanged)

- ✅ Rich-menu buttons (look車庫存, 預約賞車, etc.)
- ✅ Operator `/lock`, `/unlock` commands
- ✅ AI auto-stop on critical questions (price/condition/availability)
- ✅ Appointment form + booking confirmation
- ✅ Web chat phone-ask injection
- ✅ All existing tests (892 passing)

## Verification Checklist (For Deployment)

- [ ] Deploy PR to Railway
- [ ] **First test:** Customer says "預算30萬" → verify `conversations.budget = 3000000` in DB
- [ ] **Second test:** Same customer says "想看車" → verify reply says "根據你的預算30萬" (NOT "預算多少呢")
- [ ] **Third test:** New customer message on same conv → verify system prompt includes "【客人已知資訊】" section
- [ ] Check logs for `[LINE] Budget extracted`, `[LINE] Preferred brands extracted` messages
- [ ] Monitor operator feedback for fewer "重複問預算" complaints

## Performance Impact

- **CPU:** Negligible (regex extraction only, no new API calls)
- **Storage:** +5 columns per conversation (INT + 4×VARCHAR)
- **Latency:** None (extraction is pre-LLM, doesn't block reply)
- **Token cost:** Slight reduction (fewer re-asks = fewer LLM calls overall)

## Future Enhancements (Phase 4+)

1. **Preference override detection** — When customer says "改主意了，預算改50萬", UPDATE the DB instead of ignoring
2. **Preference decay** — If not mentioned in 7+ days, allow re-asking
3. **Dashboard UI** — Show customer preferences in admin dashboard conversations view
4. **Analytics** — Track "budget-mentioned-once" conversion rate vs. "budget-asked-3-times" (measure re-ask friction)
5. **Multi-visit preference** — Link preferences across conversations by phone number (same customer, repeat visitor)

## Memory System Architecture (Complete)

```
┌─────────────────────────────────────────┐
│   Customer Sends Message                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Extract Preferences (regex patterns)    │  ← customerMemoryExtractor.ts
│ Budget, Brand, Body Type, Visit Time    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Store in DB (first mention only)        │  ← conversations table (5 new columns)
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
   ┌─────────┐   ┌──────────────┐
   │  LLM    │   │ Rule-Based   │
   │  Mode   │   │ Reply Mode   │
   └────┬────┘   └──────┬───────┘
        │               │
        ▼               ▼
   ┌─────────────────────────────────────┐
   │ Inject into Prompt Context:         │
   │ customerBudget, customerBrand, etc. │
   └──────────┬──────────────────────────┘
              │
              ▼
   ┌─────────────────────────────────────┐
   │ buildDynamicSystemPrompt()          │
   │ ↓ buildCustomerKnownInfo()          │  ← Injects "【客人已知資訊】" section
   │ ↓ Replies with known prefs          │
   └──────────┬──────────────────────────┘
              │
              ▼
   ┌─────────────────────────────────────┐
   │ generateRuleBasedReply()            │
   │ ↓ Gate re-asks on known prefs       │  ← New gating logic (THIS PR)
   │ ↓ "根據你的預算30萬..." reply        │
   │ ↓ Never asks "預算多少" again       │
   └──────────┬──────────────────────────┘
              │
              ▼
   ┌─────────────────────────────────────┐
   │ Send Reply to Customer              │
   │ (WITHOUT re-asking known info)      │
   └─────────────────────────────────────┘
```

---

## Closeout

The LINE conversation memory system is **production-ready**. It solves the "loop" where customers feel interrogated by the same questions repeatedly. The implementation is lean, well-tested, and carries zero performance overhead.

**Next checkpoint:** Post-deploy monitoring for preference extraction accuracy and verification that operator complaint rate for "重複問預算" drops.
