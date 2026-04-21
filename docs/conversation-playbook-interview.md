# Conversation Playbook — interview script

**How to use:** Sit with Jerry (and Megan, once onboarded). Work through the questions below in order. Record answers directly into `conversation-playbook.md`. Skip anything obvious; spend real time on sections 3, 4, 5 — those drive the system prompt and the guardrail.

**Time budget:** 45–60 minutes for a first pass. Don't try to be exhaustive; fill in what you know, mark the rest `TODO` and revisit after a week of real traffic.

**Ground rules:**
- If Jerry and Megan disagree on an answer, WRITE BOTH DOWN. Disagreement is signal — resolve it offline, not in the doc.
- Be concrete. "Friendly tone" is not useful; "uses 您, no emoji in price quotes" is.
- The goal is rules a new hire could follow on day 1, not a style essay.

---

## Section 1 — Brand voice (10 min)

1. Read three recent chat logs from the bot. For each, tell me: "this sounds right" or "this sounds off." What specifically made it sound off?
2. Do you always use 您, or sometimes 你? What determines the choice?
3. Is 台語 ever acceptable in the bot's replies, or always 國語?
4. Name 3 emojis you're fine with the bot using. Name 3 you'd never want it to use.
5. Name 3 phrases the bot should NEVER say (anything that could be a legal commitment, anything overly sales-y, anything dishonest).
6. Name 3 phrases the bot should ALWAYS say in the right context (e.g., "以現場實車為準").

---

## Section 2 — Customer archetypes (10 min)

For each archetype in the playbook, I'll read you two sample opening messages. Tell me:
- What signals made this a [archetype]?
- What should the bot say in reply?
- At what point in the conversation does this become a job for you, not the bot?

7. Opening: "你好 多少錢" (cold tire-kicker signal).
8. Opening: "我想看2020年CR-V 里程數6萬以內 現金付款 你們附近嗎" (serious buyer signal).
9. Opening: "上次看的那台Altis還在嗎" (returning customer signal).
10. Opening: "我是車商 你們這台批發多少" (competitor signal).
11. Opening: "我3月買的那台BMW 空調壞了" (complaint signal — what's the handoff rule here?).

---

## Section 3 — Topic handling (15 min — most important)

For each topic, answer in one paragraph:
- "The bot CAN answer questions about X as long as ___"
- "The bot CANNOT answer questions about X when ___"
- "The bot must NEVER say ___ about X"

12. **Price.** Does the bot give a number on first reply, or direct to店裡? If it gives a number, is it the cash price or the list price?
13. **Financing / loan.** Does the bot quote rates? Terms? Or just invite the customer to consult?
14. **Trade-in.** I assume this is always handoff. Confirm. How should the bot reply while handing off?
15. **Test drive.** Does the bot book slots, or just ask "哪天方便"? If booking, where does it write the appointment?
16. **Warranty.** What's the bot allowed to promise? What requires a human?
17. **Out-of-stock request.** If a customer asks about a model we don't have, does the bot (a) say "not in stock" and stop, (b) offer similar alternatives from our inventory, or (c) offer to source it?

---

## Section 4 — Escalation & handoff rules (10 min)

18. List 5 phrases a customer might say that SHOULD trigger an auto-handoff (30-min pause). Prior list: "我要找人", "請客服", "我要聯絡負責人" — what else?
19. List 3 scenarios where the bot should go straight to permanent `aiDisabled` (not just handoff). Complaints? Legal questions? Something else?
20. When an operator taps 🔒 takeover — should the bot send a final "handing you to a human" message first, or just go silent?
21. After a 30-min handoff expires and AI resumes — what should the first AI message sound like? Or should it wait for the customer to speak first?

---

## Section 5 — Phantom-vehicle rules (5 min)

22. Top 5 models customers ask about that we DON'T stock. (Current deny list: RAV4, CR-V, Kicks, Camry, Civic — still accurate?)
23. When a customer asks about a non-stock model, what's the ideal reply? Draft the exact template.
24. If a customer insists on a specific non-stock model after we've offered alternatives, what's the next move — handoff or politely end the thread?

---

## Section 6 — Operator workflow (5 min, Megan-focused)

25. Walk through: you get a new-customer Flex card on your LINE with the 🔒 button. What do you do, in order?
26. Walk through: you want to silence the AI on a conversation you're not currently in. Which command do you use?
27. When SHOULDN'T you take over? What does the bot actually handle well?
28. What's the one thing you wish the bot did better that it doesn't?

---

## Section 7 — Known edge cases (5 min)

29. Tell me about a conversation from the last 30 days that went wrong. What should the bot have done instead?
30. Are there customer types we haven't talked about yet who show up regularly?

---

## After the interview

1. Compile answers into `conversation-playbook.md`, replacing every `_(fill in)_` with the real answer.
2. For sections 3, 4, 5 — flag any answers that differ from the current production system prompt. Those are candidates for the next prompt change (run through `scripts/prompt-council.ts` before shipping).
3. Commit the populated playbook. Note the date at the top.
4. Schedule a 15-min revisit in 30 days — playbook rots fast in the first month.

**Tip for the first interview:** if an answer starts taking more than 2 minutes to pin down, write `TODO: Jerry & Megan align on this` and move on. Forcing an answer that isn't settled makes the doc worse than a gap.
