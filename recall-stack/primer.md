# Active Project: 崑家汽車 (Kunjia Autos) — LINE chatbot + admin dashboard

Branch: `claude/disable-ai-after-human-L0br5`
Latest work: in-LINE operator controls (Megan locks AI from her own LINE — button or slash command)

## Completed This Session

- **`aiDisabled` permanent lockout column** (morning):
  - `conversations.aiDisabled int` + migration `0004_add_ai_disabled.sql`
  - Gates AI in 7 spots BEFORE typing/8891/etc; auto-locks at 4 handoff trigger sites
  - 3 admin tRPC mutations (`disableAi`, `enableAi`, `operatorReply`) with audit log
- **In-LINE operator controls** (afternoon, in response to "find a way"):
  - **One-tap takeover**: `🔒 我來接手 (停止 AI)` postback button added to both
    `buildHumanHandoffFlex` and `buildOwnerNotificationFlex` cards. Megan taps the
    button on a notification she already gets → AI locked. Zero typing.
  - **Slash commands** from operator's own LINE chat with the bot:
    `/lock`, `/lock <last8>`, `/unlock <last8>`, `/list`, `/list full`,
    `/status <last8>`, `/help`. Supports `!` prefix and full-width `／`/`！`.
    Chinese aliases: `/鎖`, `/接手`, `/解鎖`, `/清單`, `/狀態`, `/幫助`.
  - Whitelist via env: `LINE_OPERATOR_USER_IDS` (preferred) → falls back to existing
    `LINE_OWNER_USER_ID` + `LINE_ADDITIONAL_NOTIFY_USER_IDS`.
  - `/list` masks customer names by default (privacy: limit LINE-account-compromise blast).
  - `/lock` no-target shows last8 + race warning + undo hint (`/unlock <last8>`).
  - Both postback handler and `/lock` are idempotent (re-tap = no-op + ack).
  - Reviewer audit: 3 MAJORs + 4 MINOR/NIT all fixed before commit.
- **68/68 unit tests** in `server/aiDisabled.test.ts` (gating predicate, set-point patterns,
  operatorReply state machine, parseOperatorCommand variants, isOperator whitelist,
  postback data format). esbuild server bundle 505.6kb, no errors.

## Exact Next Step

**Commit + push, then deploy + set `LINE_OPERATOR_USER_IDS` env var on Railway.**
Outstanding follow-ups (separate sessions):
1. Apply `0004_add_ai_disabled.sql` to Railway production MySQL (instant DDL on 8.0.12+)
2. Optional: Dashboard UI for `disableAi`/`enableAi`/`operatorReply` (backend ready, low priority now that LINE has full coverage)
3. Megan onboarding: train her on (a) tapping the `🔒` button, (b) sending `/help` from her LINE

## Open Blockers

- **TOCTOU race** (~1-5s window): if takeover fires while LLM is in flight, AI may send one more reply. Reviewer flagged morning; not fixed.
- **Pre-existing**: 6 client-side tsc errors (BrandPage, Chat, Home, VehicleVideoPlayer, Root) unrelated.
- **Pre-existing**: 11 test files fail in sandbox (env-var dependent: DATABASE_URL, LINE secrets). Not caused by this change.
- **Pre-existing**: TRIBE v2 GPU-blocked, graphify AST-only too weak for concept queries.

## Key Knowledge

- **LINE platform reality**: webhook does NOT receive outbound messages from LINE OA Manager. Workaround = let operator signal via inbound message (button or command from THEIR own LINE).
- **`aiDisabled=1` vs `status='human_handoff'`**: handoff is temporary (auto-reactivates). `aiDisabled=1` is permanent — overrides all reactivation logic. Only operator/admin clears it.
- **Operator whitelist** is union of 3 env vars (any-of), so deployment is non-breaking — owner already gets operator powers automatically.
- **Slash-command handler runs FIRST** in the text path, before the operator-takeover lock check. So Megan can always issue commands even if her own conversation is somehow locked.
- **Suffix-match resolution**: operators see only last8 of customer userId on Flex cards / `/list`. `findBySuffix` matches against `sessionId.endsWith(last8)`. Limit 200 conversations. Ambiguous = rejected with "對應多筆".
- **`operatorReply` linePushStatus 4-state contract**: `sent` → save+lock; `failed` → don't save (operator must retry); `no_token` → don't save; `skipped` (non-LINE) → save+lock.
- **Production stack**: TypeScript/Node/Express/Drizzle/MySQL + Gemini 2.5 Flash + LINE webhook + 8891.tw sync.
- **Memory layer priority**: MCP `memory_*` → `docs/PROJECT_JOURNAL.md` → `recall-stack/primer.md` → `CLAUDE.md`.
- **Before UI work**: read `kun-auto-chatbot/docs/DESIGN.md` (shadcn/ui + Tailwind v4 + oklch tokens, deep navy single accent, 10px radius, `tabular-nums` on prices).
