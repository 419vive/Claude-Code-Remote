# Active Project: 崑家汽車 (Kunjia Autos) — LINE chatbot + admin dashboard

Branch: `claude/kunjiia-menu-buttons-issue-nt0re1` (reset off origin/main after
PR #105 merged, per convention). **PR #106 MERGED** (SHA c5b030552, 2026-07-07 ~18:45 UTC).

Latest (2026-07-07): PR #106 merged to main; Railway auto-deploy should fire within ~2-3 min.
Deep audit fixed **8 defect classes** that prevented customers from receiving AI replies on web chat:

1. **THE root cause:** `sanitizeChatMessage(message, {channel})` passed an
   object into the numeric maxLength param → `slice(0,0)` → **every customer
   message became "" before the AI saw it**. AI answered blanks all day.
   TS error (77,59) flagged it the whole time — buried in the "12 pre-existing
   errors" baseline. Baseline is now 11. LESSON: a "pre-existing" tsc error
   in a NEW file is a contradiction — investigate, never baseline it.
2. Guardrail corrections never reached the browser (unhandled
   `guardrail-fallback` SSE event) — client now replaces the bubble.
3. PRICE_QUOTE_PATTERN flagged 里程/頭期款/月付/預算 "N萬" as fake prices →
   whole replies nuked. Context exclusions added (+13 tests, 905✓ total).
4. Ghost/duplicate bubbles: stored ≠ streamed copies (shop phone masked by
   maskPIIInText, marker trim) re-appended by polling. Polling now merges
   ONLY operator messages; SHOP_PHONE whitelisted from masking.
5. 3s polling died at ~5min on generalLimiter 100/15min → dedicated
   900/15min limiter for /api/chat/history.
6. Marker-only output → silence → now falls back to LINE-redirect reply.
7. llm.ts mid-stream retry duplicated replies; no timeout during body read →
   no-retry-after-first-yield + rolling 30s idle timeout.
8. Web ignored aiDisabled + dropped operator history → gate added, operator
   turns fed to model as [真人客服回覆] assistant turns. Prompt gains
   FACT_LOCK + multi-question rule + no-re-greet.

Verification: build 606.4kb clean; tsc 12→11; vitest 905✓/46✗ (46 = same
pre-existing DB-dependent set, count unchanged).

Gold heart: deployed code verified correct. Card hearts are white UNTIL saved
(by design); the always-gold reference is the floating drawer button
(bottom-left). Jerry should hard-refresh/incognito if still navy.

## NEXT ACTION
Railway auto-deploy pending (usually 2-3 min). Once live (~18:50 UTC):
- Ask a real question (bot should finally address it, not return blank)
- Price/mileage/loan question (should not generic-card-replace)
- >5min session with operator reply (polling should work reliably)
- Impossible question (should redirect to LINE, not silence)
Sandbox cannot reach Railway to verify; Jerry to manual test on kuncar.tw

## Open Blockers
- Railway auto-deploy unreliable (manual redeploy sometimes needed)
- Dashboard UI for admin mutations not built (backend ready)
- Deferred audit items (documented, not fixed): vehicleKB not abbreviated
  around target vehicle (lost-in-middle dilution), customer-memory
  【客人已知資訊】 not injected on web, error-path UX (partial bubble +
  apology bubble), operator same-second timestamp edge in polling `since`
- Sandbox firewall: cannot reach Railway/kuncar.tw by ANY tool (curl +
  real Chromium both blocked) — live verification is always Jerry's

## Key Knowledge
- **tsc baseline is 11 now.** Never dismiss "pre-existing" errors in new files.
- **GitHub Actions "Deploy to Production" is a dead scaffold** (deploy steps
  commented out; its Type-check failures do NOT mean Railway didn't deploy —
  Railway deploys via its own GitHub integration)
- **Web handoff philosophy:** hard questions redirect to official LINE
- **Gold vs navy exception list:** VehicleLanding/Home = navy;
  Wishlist*/VideoNudge/ChatTrigger/CarValuation/FaqPage/SmartRedirect = gold
  (Jerry's explicit call); MediaKit/AboutUs/Blog/remotion untouched
- **Polling channel contract:** web polling merges operator messages ONLY;
  local streamed copies are authoritative for user/assistant
- **Family context:** Jerry's father (70) uses phone; Megan onboarding
- **Stack:** Node/Express/Drizzle/MySQL + Gemini 2.5 Flash + LINE + 8891 sync

## Deployed + Working (after #106 merges)
- Permanent AI lockout (`aiDisabled`) — now honored on web too
- In-LINE operator controls; postback takeover buttons
- Phantom-vehicle guardrail + Fact Lock — now also in the web prompt
- SSE token streaming + 3s operator polling — both now actually correct
  end-to-end (input no longer blanked, corrections displayed, no duplicate
  bubbles, no 5-minute polling death)
