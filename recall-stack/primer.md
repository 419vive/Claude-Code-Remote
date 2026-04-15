# Active Project: 崑家汽車 (Kunjia Autos) — LINE chatbot + admin dashboard

Branch: `claude/disable-ai-after-human-L0br5`
Latest work: operator-takeover lock — once a human operator intervenes, AI is permanently silent

## Completed This Session

- **Permanent AI lockout (`aiDisabled` column)** for LINE + web chat
  - New `conversations.aiDisabled int` column (drizzle/schema.ts + drizzle/0004_add_ai_disabled.sql)
  - Distinct from temporary `status='human_handoff'` (auto-reactivates after 30 min, on rich menu, on "我想了解")
  - Gate placed BEFORE typing indicator + 8891 short-circuit + every AI reply path
- **3 new admin tRPC mutations** in `server/routes/adminRoutes.ts`:
  - `disableAi(conversationId, reason?)` — operator clicks lock after replying via LINE OA console
  - `enableAi(conversationId, reason?)` — re-enable bot (rare)
  - `operatorReply(conversationId, message)` — LINE pushMessage + auto-lock
  - Returns 4-state `linePushStatus: sent | failed | no_token | skipped`
  - Skips transcript when push fails (customer never received it)
  - Audit-logs to `analyticsEvents` (eventCategory='operator_takeover')
- **Auto-lock at 4 existing handoff trigger sites** (so any handoff is permanent):
  - User says "想跟真人" (lineWebhook.ts ~885)
  - AI emits `[HUMAN_HANDOFF]` token (lineWebhook.ts ~1431)
  - Flexible-time silent handoff (lineWebhook.ts ~1174)
  - Web chat handoff (routers.ts:909)
- **Gates added in 7 spots**: lineWebhook text/image/non-text/postback/follow-welcome, lineRecovery nudges + follow-ups, routers web chat
- **48 unit tests** in `server/aiDisabled.test.ts`, all green (gating predicate, set-point patterns, operatorReply state machine)
- **Reviewer + tester subagents** dispatched — both surfaced real issues, all blockers/majors fixed

## Exact Next Step

**Commit + push to `claude/disable-ai-after-human-L0br5`, then wait for Jerry's review.**
Outstanding follow-ups (separate sessions):
1. Dashboard UI for the 3 new mutations (button on conversation detail to lock/unlock + reply textarea)
2. Apply `0004_add_ai_disabled.sql` to Railway production MySQL (instant DDL on 8.0.12+, safe)

## Open Blockers

- **Dashboard UI** for the 3 new mutations not built (out of scope this session)
- **TOCTOU race** (~1-5s window): if `disableAi` fires while LLM is in-flight, AI may send one more reply. Reviewer flagged; acceptable for now.
- **Pre-existing**: 6 client-side tsc errors (BrandPage, Chat, Home, VehicleVideoPlayer, Root) unrelated to this change.
- **Pre-existing**: 11 test files fail in sandbox (env-var dependent). Not caused by this change.
- **Pre-existing**: TRIBE v2 GPU-blocked, graphify AST-only too weak for concept queries.

## Key Knowledge

- **LINE platform reality**: When operator replies via LINE OA Manager console, the bot webhook does NOT receive those outbound messages. Bot has no auto-detect — admin must click `disableAi` OR reply via dashboard's `operatorReply` (auto-locks).
- **`aiDisabled=1` vs `status='human_handoff'`**: handoff is temporary (auto-reactivates). `aiDisabled=1` is permanent — overrides all reactivation logic. Only admin clears it via `enableAi`.
- **`operatorReply` linePushStatus 4-state contract**:
  - `sent` → transcript saved, conv locked
  - `failed` → NOT saved, NOT locked (operator must retry)
  - `no_token` → token missing, NOT saved, NOT locked
  - `skipped` → non-LINE channel, saved + locked
- **Drizzle MySQL migration style**: manual SQL in `kun-auto-chatbot/drizzle/`, follows 0002/0003 convention. `_journal.json` only tracks auto-generated 0000/0001.
- **Production stack**: TypeScript/Node/Express/Drizzle/MySQL + Gemini 2.5 Flash + LINE webhook + 8891.tw sync.
- **Memory layer priority**: MCP `memory_*` tools → `docs/PROJECT_JOURNAL.md` → `recall-stack/primer.md` → `CLAUDE.md`.
- **Before UI work**: read `kun-auto-chatbot/docs/DESIGN.md` (shadcn/ui + Tailwind v4 + oklch tokens, deep navy single accent, 10px radius, `tabular-nums` on prices).
