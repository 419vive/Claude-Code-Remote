# Active Project: 崑家汽車 (Kunjia Autos) — LINE chatbot + admin dashboard

Branch: `main` (PRs #88 + #89 merged 2026-04-23)
Latest: **Stale-history fix merged** (PR #89 commit `3c1f308`) — awaiting Railway deploy + Jerry's live retry of the 3 test questions. Fact Lock (#88) already live. 348/348 tests green on main.

## Deployed + Working (end of 2026-04-16 session)

- **Permanent AI lockout (`aiDisabled` column)** — operator intervention = silent AI forever
- **In-LINE operator controls** — `/whoami`, `/help`, `/lock`, `/unlock`, `/list`, `/status` from operator's own LINE (whitelist via `LINE_OPERATOR_USER_IDS` + fallback to `LINE_OWNER_USER_ID` + `LINE_ADDITIONAL_NOTIFY_USER_IDS`)
- **Postback takeover button** (🔒 我來接手) on handoff + high-quality-lead + new-customer Flex cards
- **New-customer notification** — operator gets a Flex card with 🔒 button on message #1 of every new LINE conversation (fires once via `allHistory.length === 1` gate)
- **Phantom-vehicle guardrail** — prompt "庫存鎖" + output detection of RAV4/CR-V/Kicks/Camry/Civic etc. with critical-fail → rule-based fallback
- **Self-lock prevention** — `/lock` refuses to target the operator's own conversation (both explicit and no-target)
- **Idempotent DB migration on startup** — `INFORMATION_SCHEMA`-guarded ALTER in `runMigrations()` guarantees `aiDisabled` column exists regardless of Nixpacks/Dockerfile divergence
- **81/81 unit tests** green in `server/aiDisabled.test.ts`

## Exact Next Step

**Megan onboarding** (Jerry has the playbook):
1. Megan adds 崑家汽車 OA → texts `/whoami` → gets her userId
2. Megan sends userId to Jerry
3. Jerry appends to `LINE_OPERATOR_USER_IDS` env var on Railway (comma-separated)
4. Railway auto-redeploys (or Jerry manually forces if auto fails)
5. Megan re-tests `/whoami` → ✅ → can now use `/lock` `/list` etc.

## Open Blockers (deferred, not urgent)

- **Railway auto-deploy unreliable** — Jerry manually redeployed multiple times during this session. Root cause unclear; Railway dashboard issue, not our code.
- **Dashboard UI for admin mutations** (`disableAi`/`enableAi`/`operatorReply`) not built — backend ready; LINE coverage satisfies primary need
- **TOCTOU race** (~1-5s): if `/lock` fires while LLM in-flight, one more AI reply may sneak through. Acceptable for now.
- Pre-existing client-side tsc errors (6) unrelated
- TRIBE v2 GPU-blocked, graphify AST-only weak

## Key Knowledge

- **Production deploy stack**: Railway uses Nixpacks auto-detect and **ignores the Dockerfile CMD** — my `scripts/run-migrations.mjs` never ran. Any startup-time code MUST go into `server/_core/index.ts runMigrations()` to be guaranteed to execute.
- **Migration style for production**: use `INFORMATION_SCHEMA.COLUMNS` check before `ALTER TABLE` — idempotent, safe to re-run on every container start.
- **LINE platform reality**: webhook does NOT receive outbound messages from LINE OA Manager. Workaround = operator signals via inbound (button tap or slash command from THEIR own LINE).
- **`aiDisabled=1` vs `status='human_handoff'`**: handoff temporary (30-min auto-recovery). `aiDisabled=1` permanent — only admin/operator clears.
- **Operator whitelist**: union of 3 env vars. Jerry's userId is in `LINE_OPERATOR_USER_IDS` (added during this session).
- **/lock safety rules**:
  - Operator's own conversation is ALWAYS filtered out (explicit target rejected + no-target skipped)
  - No-target scans last 10 conversations (widened from 5 to handle chatty operators)
  - Always shows last8 + race warning + undo hint in confirmation
  - Idempotent (re-tap = ack-only, no re-write)
- **Hallucination guardrail 3-layer defense**:
  - Prompt inventory lock at END of system prompt (recency bias)
  - Output validator flags `hallucinated_vehicle:*` against curated deny-list
  - Critical-fail → `generateRuleBasedReply` (only references real DB)
- **`operatorReply` linePushStatus 4-state contract**: `sent` → save+lock; `failed` → don't save; `no_token` → don't save; `skipped` (non-LINE) → save+lock.
- **Production stack**: TypeScript/Node/Express/Drizzle/MySQL + Gemini 2.5 Flash + LINE webhook + 8891.tw sync.
- **Memory layer priority**: MCP `memory_*` → `docs/PROJECT_JOURNAL.md` → `recall-stack/primer.md` → `CLAUDE.md`.
- **Before UI work**: read `kun-auto-chatbot/docs/DESIGN.md` (shadcn/ui + Tailwind v4 + oklch tokens, deep navy single accent, 10px radius, `tabular-nums` on prices).

## Fact Lock Defense (2026-04-23 — pending commit on `claude/add-free-api-keys-0SGxN`)

- **Root cause of Mufasa incident**: AI quoted `newCarPrice` MSRP (98.9萬) instead of used-car `priceDisplay` (80.9萬); no prompt rule against saying "新車"; hallucinated "台北內湖" location. All three ship together in one fix.
- **`kun-auto-chatbot/shared/shopConfig.ts`** is the NEW single source of truth. Every hardcoded shop address/phone/type/map URL across the codebase is deleted. Add a new fact there, it propagates.
- **`kun-auto-chatbot/shared/priceFormat.ts`** — `formatVehiclePriceSafe` (text) + `formatPriceForCard` (flex) — never emits "undefined萬".
- **`FORBIDDEN_LOCATIONS` / `FORBIDDEN_DEALERSHIP_TERMS` / `LEAKY_FIELD_NAMES`** exported from shopConfig; `security.ts` detects all three classes and marks `safe=false` → caller falls back to `generateRuleBasedReply`.
- **FACT_LOCK prompt section** is the LAST thing in the system prompt (after targetVehiclePrompt + intentInstructions + address reminder). DO NOT push anything below it.
- **Image-path fallback contract is INTENTIONALLY different** from text paths (lineWebhook.ts:697 has a full comment explaining why generateRuleBasedReply isn't used there — image intent has no detection context).
- **`seo.ts` still has ~15 prose hardcodes** of address for SEO Q&As — intentionally deferred, not customer-AI-facing.
- **97/97 fact-lock tests green**, **+66 passing vs clean main**, `tsc` clean.

## Cloud Sandbox Network Limits (discovered 2026-04-22)

- **This sandbox's firewall BLOCKS Railway domains** (`railway.com`, `backboard.railway.app`). Symptom: every request returns "Host not in allowlist / HTTP 403". Railway CLI is installed (`/opt/node22`, v4.40.2) but completely unusable from here. DO NOT ask Jerry to generate Railway tokens — they cannot be used and pollute chat transcripts.
- **What I CAN do via GitHub MCP**: confirm pushes reached GitHub via `mcp__github__list_commits` / `get_commit` (returns SHA + message + timestamp). Scope is restricted to `419vive/kunjia-autos-ai-chatbot`.
- **What I CANNOT do via available MCP tools**: read Railway deploy statuses, deployment events, or GitHub commit check-run states (no matching endpoint in current tool set). Prior estimate of "60% of Railway questions covered via GitHub" was wrong — real number ~20% (push confirmation only).
- **Workflow for Railway operations**: Jerry screenshots Railway dashboard / pastes terminal output, I interpret and draft next command. For code changes (everything in the repo), full local filesystem access works fine.
- **Family context**: Jerry's father (shop owner) is **70**, not 50. Runs business entirely from phone. This shapes accessibility decisions (phone-first, no dashboard, text commands).
- **Business impact baseline**: 6 cars sold in the first month after the LINE operator-takeover + phantom-vehicle system went live. Use this number when describing ROI/impact.
