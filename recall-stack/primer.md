# Active Project: 崑家汽車 (Kunjia Autos) — LINE chatbot + admin dashboard

Branch: `claude/ai-response-timing-chat-46l4sd` (off main, latest `9dbacb5` = PR #100). PRs #92/#93/#94/#95/#100 merged.

Latest (2026-06-29): **AI auto-stop on critical buyer questions + appointment form** (this branch). Serious buyers skip the rich menu and ask 價格/殺價/車況/還在不在 directly; AI answers (sometimes wrong) → customer leaves, operator never alerted. Fix: new pure `server/handoffTriggers.ts` (`detectCriticalHandoff`, 27 tests) — make-or-break questions (詢價 on a real car / 殺價議價 / 車況 / 還在不在) → `lineWebhook.ts` pushes operator handoff card (🔒 接手), replies a short ack (or phone fallback), logs `ai_auto_stopped_critical_question`, locks AI (`aiDisabled:1`). General chat/loan/specs stay on AI (Jerry's choice — family not always online, don't blanket-silence). **Appointment intent now notifies + locks AI** after the datetimepicker; the `appointment_datetime` postback confirmation is exempt from the aiDisabled gate so booking still completes. Removed disliked booking nudge「看車的時間有想到嗎…電話再聊也可以」in `lineRecovery.ts`. Suite 832✓/46✗ (46 pre-existing), tsc clean (6 pre-existing client errs), build 564.1kb. **Needs Railway deploy to verify live.**

Earlier (2026-06-28): **LINE photo watermark fix** (PR #100, merged) — 8891 hotlinks against LINE's fetcher; `server/imageProxy.ts` `GET /img/8891?u=…` re-fetches with iPhone UA + 8891 Referer, `toProxiedPhotoUrl()` wraps 4 LINE image spots. SSRF-guarded. 14 tests.

Earlier (2026-05-03): **Phase 2 chat-widget phone ask shipped** (PR #95, merged) — when a web visitor's lead score reaches ≥ 50 AND no phone yet AND no recent ask, the AI naturally requests a phone in the same turn. Prompt-only (no DB migration), self-suppressing via 5-turn lookback over assistant message history. Channel-gated to web (LINE has identity). New `server/phoneAsk.ts` + `server/phoneAsk.test.ts` (38 tests). Closes the actionability loop PR #92 opened.

Also (2026-05-03): **Memory hook hardening** (PR #94, this branch) — new `UserPromptSubmit` hook `.claude/helpers/memory-search-hook.sh` injects journal excerpts when the prompt contains memory-trigger keywords (之前 / 上次 / 有沒有 / 曾經 / 先前 / 決定過 / before / did we / decided / previously / remember / recall / last time). Complements PR #93's `@docs/PROJECT_JOURNAL.md` import (which only fires on SessionStart). Hook fails silent on any error, capped at ~50 lines / ~3KB. Removed dead `auto-memory-hook.mjs import`/`sync` registrations from SessionStart/Stop. 1-week trial: monitor token consumption.

Earlier (2026-05-04): **Memory reliability fix** (PR #93, merged) — added `@docs/PROJECT_JOURNAL.md` to CLAUDE.md auto-import. Journal auto-loads on every session via Claude Code's `@` directive — deterministic, no hooks, no LLM, no fallible logic.

Earlier (2026-05-02): **Web lead notification actionability fix** (PR #92, merged) — conversationId + dashboard deep link, resolves vehicle IDs to "Brand Model Year", suppresses score-50 notifications when web visitor has no contact info.

## Deployed + Working

- **Permanent AI lockout (`aiDisabled` column)** — operator intervention = silent AI forever
- **In-LINE operator controls** — `/whoami`, `/help`, `/lock`, `/unlock`, `/list`, `/status` from operator's own LINE
- **Postback takeover button** (🔒 我來接手) on handoff + high-quality-lead + new-customer Flex cards
- **New-customer notification** — Flex card with 🔒 button on message #1 of every new LINE conversation
- **Phantom-vehicle guardrail** — prompt "庫存鎖" + output validator + rule-based fallback
- **Self-lock prevention** — `/lock` refuses to target operator's own conversation
- **Idempotent DB migration on startup** in `runMigrations()`
- **Fact Lock** (PR #88) — shopConfig.ts as single source of truth, FORBIDDEN_LOCATIONS/DEALERSHIP_TERMS/LEAKY_FIELD_NAMES detection, FACT_LOCK prompt section last in system prompt

## Exact Next Step

1. **Verify AI auto-stop after Railway deploy** (this branch's PR): (a) customer (no menu) asks「這台多少錢」/「可以殺價嗎」/「有沒有事故」/「還在嗎」on a car in context → AI sends short ack (not a price/condition answer), operator gets 🔒 接手 card, conversation locks; (b)「我想預約看車」→ datetimepicker → operator card + lock → customer picks time → STILL gets confirmation + booking-form link; (c) grep prod logs for `🛑 Critical high-intent question` and `ai_auto_stopped_appointment`. Sandbox can't test live (firewall).
2. **Watch the over-lock trade-off**: appointment intent now permanently locks AI (Jerry's choice). If too many booking convos pile up needing `/unlock`, switch appointments to auto-expiring 30-min `human_handoff` instead of `aiDisabled:1`.
3. Tune `detectCriticalHandoff` regexes (`handoffTriggers.ts`) if real traffic shows false-positives/negatives — it's a pure, fully-tested module so easy to adjust.

Phase 3 candidates (not started): operator-side phone-capture-rate metric in admin dashboard; A/B test soft-ask vs. explicit "Get a quote" CTA at score ≥ 80.

## Open Blockers

- **Railway auto-deploy unreliable** — Jerry manually redeployed multiple times in prior sessions. Not our code, Railway dashboard issue.
- **Dashboard UI for admin mutations** (`disableAi`/`enableAi`/`operatorReply`) not built — backend ready; LINE coverage satisfies primary need
- **TOCTOU race** (~1-5s) on `/lock` with in-flight LLM call — acceptable for now
- Pre-existing client-side tsc errors (6) unrelated — confirmed unchanged by today's edits
- 46/799 vitest failures are pre-existing (DB-required tests need `DATABASE_URL`) — confirmed identical on main and on this branch

## Key Knowledge

- **`routes/leadScoring.ts` is dead code** — duplicate of `routers.ts:134-244` (`checkAndNotifyOwner`). Nothing imports it. Today's edits applied to the LIVE copy in `routers.ts`. Cleanup deferred.
- **Web channel = anonymous browser visitors** via `/chat` page (`Chat.tsx:13-17` — `nanoid()` sessionId in localStorage). No userId, no push channel — if user doesn't leave a phone number, they cannot be contacted. This is the structural reason the original "未知" notification was unactionable.
- **Web chat widget added 2026-04-06 (PR #71)** with Meta Pixel/Google Ads. Real traffic only started arriving recently → first anonymous web lead surfaced today.
- **Production deploy stack**: Railway uses Nixpacks auto-detect and ignores Dockerfile CMD. Any startup-time code MUST go in `server/_core/index.ts runMigrations()`.
- **LINE platform reality**: webhook does NOT receive outbound messages from LINE OA Manager. Operator signals via inbound (button tap or slash command from THEIR own LINE).
- **Operator whitelist**: union of `LINE_OPERATOR_USER_IDS` + `LINE_OWNER_USER_ID` + `LINE_ADDITIONAL_NOTIFY_USER_IDS`.
- **Production stack**: TypeScript/Node/Express/Drizzle/MySQL + Gemini 2.5 Flash + LINE webhook + 8891.tw sync.
- **Memory layer priority**: file `@` imports (journal + primer auto-loaded) → MCP `memory_*` (HNSW vector search for cross-session patterns) → CLAUDE.md (rules). Journal is the source of truth for project decisions.
- **Before UI work**: read `kun-auto-chatbot/docs/DESIGN.md`.
- **Cloud sandbox firewall blocks Railway domains** — cannot run Railway CLI / read deploy status from here. Use GitHub MCP for push confirmation only.
- **Family context**: Jerry's father (shop owner) is 70, runs business from phone. Megan being onboarded as second operator. 6 cars sold first month after LINE operator-takeover + phantom-vehicle system.
- **BASE_URL env var fallback**: `https://claude-code-remote-production.up.railway.app` (used throughout — see lineFlexTemplates.ts, lineRecovery.ts, etc.)
