# Active Project: 崑家汽車 (Kunjia Autos) — LINE chatbot + admin dashboard

Branch: `claude/phase-2-chat-phone-ask` (off origin/main `2c7618e`). Phase-2 follow-up to PR #92 (web-lead-notify, merged 2026-05-02). PRs #88 + #89 already merged to main 2026-04-23.

Latest (2026-05-03): **Phase 2 chat-widget phone ask shipped** — when a web visitor's lead score reaches ≥ 50 AND no phone yet AND no recent ask, the AI naturally requests a phone in the same turn. Prompt-only (no DB migration), self-suppressing via 5-turn lookback over assistant message history. Channel-gated to web (LINE has identity). New `server/phoneAsk.ts` + `server/phoneAsk.test.ts` (38 tests). Wired into the inline web `chat` system prompt in `server/routers.ts`. Closes the actionability loop PR #92 opened: PR #92 hid the noisy notification; this one converts the lead by asking for contact in-chat.

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

1. After Railway redeploys, monitor next 1-2 weeks of web leads on the `Conversations` dashboard: phone-capture rate on web channel should rise. Suppressed score-50 notifications (PR #92) should re-appear as score-≥-80 + contact-attached notifications.
2. Production log grep for `WebChat PhoneAsk: injected` to confirm trigger fires.
3. After PR #94 merges, verify next session that the UserPromptSubmit memory hook auto-injects relevant journal excerpts on memory-trigger keywords.

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
