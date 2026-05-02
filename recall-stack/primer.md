# Active Project: 崑家汽車 (Kunjia Autos) — LINE chatbot + admin dashboard

Branch: `claude/evaluate-openai-agents-FYaAh` (designated by session instructions; name is misleading — work is web-lead notification fix, not OpenAI Agents eval). PRs #88 + #89 already merged to main 2026-04-23.

Latest (2026-05-02): **Web lead notification actionability fix** — adds conversationId + dashboard deep link, resolves vehicle IDs to "Brand Model Year", suppresses score-50 notifications when web visitor has no contact info. Triggered by Megan-Jerry screenshot of unactionable "💬 網站潛在客戶有興趣！Score: 50 / 客戶名稱：未知 / 電話：未提供 / 感興趣車輛：17, 9". Awaiting commit + push + draft PR.

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

1. Commit the web-lead-notification fix (Conversations.tsx + routers.ts)
2. Push to `claude/evaluate-openai-agents-FYaAh`
3. Open draft PR titled something like "fix(web-lead-notify): deep link + vehicle names + suppress no-contact score-50"
4. After Railway redeploys, Jerry/Megan should see new format on next web lead

Phase 2 (deferred to next session): chat widget asks for phone at score ≥ 50 to convert anonymous visitors into contactable leads.

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
- **Memory layer priority**: MCP `memory_*` → `docs/PROJECT_JOURNAL.md` → `recall-stack/primer.md` → `CLAUDE.md`.
- **Before UI work**: read `kun-auto-chatbot/docs/DESIGN.md`.
- **Cloud sandbox firewall blocks Railway domains** — cannot run Railway CLI / read deploy status from here. Use GitHub MCP for push confirmation only.
- **Family context**: Jerry's father (shop owner) is 70, runs business from phone. Megan being onboarded as second operator. 6 cars sold first month after LINE operator-takeover + phantom-vehicle system.
- **BASE_URL env var fallback**: `https://claude-code-remote-production.up.railway.app` (used throughout — see lineFlexTemplates.ts, lineRecovery.ts, etc.)
