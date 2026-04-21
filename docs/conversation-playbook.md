# 崑家汽車 — Conversation Playbook

**Status:** TEMPLATE. Fill in during the interview session (see `conversation-playbook-interview.md`). Once populated, this becomes the source of truth for how the LINE chatbot and the human operators (Jerry, Megan, future staff) speak to customers. The bot's system prompt compiles pieces of this doc; new-hire training starts from this doc.

**Owner:** Jerry. **Last updated:** _(fill in when populated)_.

**Relationship to the code:**
- The LINE bot's system prompt (in `server/dynamicPromptBuilder.ts`) encodes rules from sections 2, 3, 4, 5.
- Phantom-vehicle guardrail (`server/security.ts`) enforces section 5.
- Handoff logic (`server/lineWebhook.ts`) enforces section 6.
- If this doc and the code disagree, the code wins **until** a PR is opened to align them. Never let the doc rot silently.

---

## 1. Brand voice

_How the bot sounds. Consistent across all customer-facing output._

**Register:** _(e.g., Traditional Chinese, friendly-but-professional, no slang, no emoji in price quotes)_

**Use of "您" vs "你":** _(fill in)_

**Taiwanese (台語) phrases OK?** _(yes/no, examples if yes)_

**Emoji policy:** _(which emojis OK, which banned, e.g., 🚗 ✅, but never 💰 near price)_

**Things the bot never says:** _(e.g., "保證最低價", "絕對無故障", anything that could be a legal commitment we can't back)_

**Things the bot always says when relevant:** _(e.g., "以現場實車為準", "可以來店實車賞車", "付款方式有現金和貸款兩種")_

---

## 2. Customer archetypes

_Who's on the other side, and how the bot should pattern-match them._

### 2a. Cold tire-kicker
- Signals: vague questions ("多少錢？" with no vehicle), no clear model, checks many cars
- How to handle: _(fill in)_
- When to stop replying: _(fill in)_

### 2b. Serious buyer
- Signals: specific model + year + mileage constraints, asks about financing/trade-in
- How to handle: _(fill in)_
- Handoff trigger: _(fill in)_

### 2c. Returning customer
- Signals: known LINE userId has prior conversation or purchase
- How to handle: _(fill in)_

### 2d. Competitor / market researcher
- Signals: extreme price questions, no intent to visit, asks about stock levels or wholesale
- How to handle: _(fill in)_

### 2e. Complaint / problem from existing owner
- Signals: "我買的那台...", warranty claims, post-sale issues
- How to handle: **ALWAYS handoff.** Never let the bot triage complaints.

### 2f. Spam / wrong-number
- Signals: not asking about cars at all
- How to handle: _(fill in)_

---

## 3. Topic handling

_For each topic, the exact stance the bot takes. If a customer asks something off-list, bot should either answer from first principles using the brand voice, OR hand off. Never invent facts._

| Topic | Bot answers | Bot defers to operator | Never say |
|-------|-------------|------------------------|-----------|
| Stock availability | _(from DB only, e.g., "目前庫存為 {list}")_ | _(when uncertain)_ | Phantom models |
| Price | _(fill in — e.g., cash-only pricing for first reply?)_ | _(when negotiation starts)_ | _(fill in)_ |
| Financing / loan | _(fill in)_ | _(fill in)_ | _(fill in)_ |
| Trade-in | | ALWAYS — need physical inspection | Specific trade-in numbers |
| Test drive booking | _(fill in — does the bot take bookings or only ask preferred day?)_ | _(fill in)_ | |
| Warranty | _(fill in)_ | _(fill in)_ | Promises we can't back |
| Delivery / logistics | _(fill in)_ | _(fill in)_ | |
| Out-of-stock request | _(fill in — take a note? offer alternatives?)_ | _(fill in)_ | "We can get anything" |
| Payment methods | _(fill in)_ | | |
| After-sales service | | ALWAYS | Repair estimates |
| Legal / contract questions | | ALWAYS | Anything a lawyer would veto |

---

## 4. Escalation rules

_When the bot proactively hands off or locks itself down._

**Auto handoff (30-min temporary pause, auto-resumes):**
- _(fill in — e.g., customer says "我要找人", "請客服", "我要聯絡負責人")_
- _(fill in — e.g., customer explicitly complains)_
- _(fill in — e.g., customer asks about financial decisions we shouldn't automate)_

**Permanent `aiDisabled` lock (only operator can unlock):**
- Operator taps 🔒 takeover button
- Operator uses `/lock` from their LINE
- _(fill in — any other conditions?)_

**Silent log-and-continue (no handoff, but flag for weekly review):**
- _(fill in — e.g., customer uses banned language, but conversation is otherwise fine)_

---

## 5. Phantom-vehicle rules

_This section directly drives `server/security.ts` validator. Keep it in sync._

**Deny list** (vehicles we don't stock and must never offer): _(fill in — current: RAV4, CR-V, Kicks, Camry, Civic are commonly-asked non-stock)_

**Response template when customer asks for a non-stock vehicle:**
_(fill in — e.g., "目前這台不在庫存，以下是我們現有的相似車款：{list}")_

**Never do:**
- Invent a model year or mileage
- Say "I'll check and get back to you" (the bot has no way to check)
- Offer to "source" or "import" a car

---

## 6. Operator workflows

_Coverage for Jerry and Megan._

### 6a. In-LINE commands (from operator's own LINE)
- `/whoami` — get your LINE userId
- `/help` — list commands
- `/lock [target]` — permanently silence AI on a conversation
- `/unlock [target]` — re-enable AI
- `/list` — list recent active conversations
- `/status` — see your own lock/handoff state

### 6b. Takeover button (🔒 我來接手)
- Appears on: handoff cards, high-quality-lead cards, new-customer cards
- Effect: sets `aiDisabled=1` for that conversation
- Fires operator notification

### 6c. When to use which
- `/lock` → customer needs sustained human attention
- 🔒 button → urgent takeover during live conversation
- Nothing → bot handles it; monitor via dashboard

### 6d. Self-lock prevention
- `/lock` on your own conversation is refused
- No-target `/lock` skips the operator's own conversation
- (This is enforced in code; noted here for operator awareness.)

---

## 7. Known edge cases

_Scenarios we've hit in production that need documented responses. Add as new cases surface._

### Case: Customer asks about a vehicle that was in inventory yesterday but is now sold
- Current behavior: _(fill in)_
- Desired behavior: _(fill in)_

### Case: Customer asks price in English
- Current behavior: _(fill in)_
- Desired behavior: _(fill in)_

### Case: Customer sends photo of their current car asking for trade-in quote
- Current behavior: handoff (operator handles)
- Desired behavior: bot acknowledges + handoff with a friendly reply

### Case: Customer asks for an appointment outside business hours
- Current behavior: _(fill in)_
- Desired behavior: _(fill in)_

---

## 8. Glossary

_Terms internal to our operation that might be unclear to new hires._

- **aiDisabled** — permanent operator lock. Bot never replies. Only operator can unlock.
- **human_handoff** — temporary pause (30 min), auto-resumes on new inquiry / rich-menu tap / timeout.
- **Rich menu** — persistent bottom bar in LINE (看車庫存 / 預約賞車 / 關於崑家 / 最新優惠).
- **Flex card** — rich message with buttons, used for new-customer notification and handoff cards.
- **8891.tw** — Taiwan's main used-car listing site; our inventory is synced from there.
- **Gemini 2.5 Flash** — the LLM the bot runs on.

---

## Change log

_Append `## YYYY-MM-DD — what changed` entries here as the playbook evolves. Newest first._

### _(not yet filled in)_
