# Active Project: 崑家汽車 (Kunjia Autos) — LINE chatbot + admin dashboard

Branch: `claude/threads-lead-radar` (off main `9dbacb5`). PRs #92/#93/#94/#95/#100 merged.

Latest (2026-06-29): **Threads Lead Radar shipped** (branch `claude/threads-lead-radar`, draft PR) — env-gated social-listening tool. Jerry wanted "auto-find buy-car posts on FB/Threads → AI auto-comments 崑家+link". Verified (8-agent compliance workflow): auto-commenting on strangers is BANNED (Meta ToS + group admins), FB Groups have no API (deprecated Apr 2024), Meta Content Library is research-only (not a loophole). Only viable path = Threads "discover public posts → HUMAN replies". Built `server/threadsLeadRadar.ts`: queries a **third-party Threads keyword-search API (Apify/EnsembleData — no Meta App Review needed, account-safe)** → buy-intent filter → dedupe → Gemini draft → LINE push to Jerry+Megan → they reply by hand in Threads. 22 tests green, build clean. **Inert until Jerry sets `THREADS_SEARCH_API_KEY`+`THREADS_SEARCH_ACTOR` on Railway + pays the past-due bill.** Higher-ROI alternative discussed: Meta Lead Ads (~US$25-50/lead, sanctioned).

Earlier (2026-06-28): **LINE vehicle-photo watermark fix shipped** (PR #100, MERGED — but see blocker: Railway deploy showed old commit `2f3d3a7f`, not the merge `9dbacb5`; **Railway subscription past-due** likely blocking auto-deploy) — Jerry's LINE card showed 8891's grey "8891 中古車" watermark instead of the real Subaru Forester photo, but the SAME photo renders fine on the website + 8891. Root cause: 8891 **hotlink-protects against LINE's server-side image fetcher** — we hand LINE raw `p1.8891.com.tw` URLs with no re-hosting. Fix: new `server/imageProxy.ts` exposes `GET /img/8891?u=…` that re-fetches with 8891-valid headers (iPhone UA + `Referer: https://www.8891.com.tw/`) and streams real bytes back; `toProxiedPhotoUrl()` wraps all 4 LINE 8891-image spots in `lineFlexTemplates.ts`. SSRF-guarded (https + `*.8891.com.tw` only). 14 new tests green; build clean. **Needs Railway deploy to verify live** (sandbox firewall blocks 8891).

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

0. **Jerry must PAY the past-due Railway bill** — banner "subscription past due" seen 2026-06-29; PR #100 deploy showed stale commit `2f3d3a7f` (not merge `9dbacb5`), likely because billing paused auto-deploy. NOTHING (photo fix, Threads radar) goes live until this is paid + redeployed.
0b. **Threads Lead Radar (PR `claude/threads-lead-radar`)**: after merge + Railway paid, Jerry (1) opens an Apify/EnsembleData account → API key, (2) sets `THREADS_SEARCH_API_KEY` + `THREADS_SEARCH_ACTOR` env on Railway. Then operators get LINE pushes with buy-car post + draft. Verify via log `ThreadsRadar: Sweep done`. Radar is inert without the key.
1. **Verify photo-proxy after Railway deploy** (PR #100, merged): (a) open `${BASE_URL}/img/8891?u=<an 8891 photo url>` in a browser → real car photo, not watermark; (b) trigger a vehicle card in LINE → hero shows real photo; (c) grep prod logs for `ImageProxy` warns. Sandbox can't test live (firewall blocks 8891). Quick "is it deployed" check: open `${BASE_URL}/img/8891` → `invalid image url` = new code live; SPA homepage = still old.
2. After Railway redeploys, monitor next 1-2 weeks of web leads on the `Conversations` dashboard: phone-capture rate on web channel should rise. Suppressed score-50 notifications (PR #92) should re-appear as score-≥-80 + contact-attached notifications.
3. Production log grep for `WebChat PhoneAsk: injected` to confirm trigger fires.

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
