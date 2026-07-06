# Active Project: 崑家汽車 (Kunjia Autos) — LINE chatbot + admin dashboard

Branch: `claude/kunjiia-menu-buttons-issue-nt0re1` (reset off latest main 2026-07-06,
prior lineage — PR #102/#103 — already merged & deployed). PR #104 open (draft),
subscribed to activity, ~1hr self check-in scheduled.

Latest (2026-07-06): Phase 2+3 deployed to Railway + confirmed live. Ran the full
7-item RAILWAY_DEPLOY_CHECKLIST verification (sandbox can't reach Railway/kuncar.tw
— reconfirmed 403 CONNECT tunnel — so verified each item at the code level: real
logic run against mock data, or direct code reading, instead of asking Jerry to
click through). **Found + fixed 4 real bugs, all pushed to PR #104:**

1. Chinese synonym search (豐田/休旅/越野/軍用) returned zero results —
   capitalized synonym value never lowercased before case-sensitive `.includes()`.
2. Vehicle context passthrough was silently dead on `/api/chat/stream` —
   `vehicleContext` destructured but never used (legacy tRPC path did it right;
   `Chat.tsx` only calls the streaming endpoint now).
3. SSE streaming was being buffered by gzip — `text/event-stream` is compressible
   by mime-db default, no exemption existed, so tokens arrived in bursts not
   one-by-one. Added same exemption pattern as `/api/line/webhook`.
4. Operator polling latency doubled after every new message — `fetchMessages`
   depended on `messages` state, tearing down/rebuilding the poll interval each
   time. Also fixed a truncated (20-char) dedup key in `Chat.tsx` that could
   drop a genuinely new operator message sharing a prefix with an earlier one.

Rich-menu-while-locked and trade-in-photo-context items: verified correct by
direct code reading, no bugs found.

**Flagged, not fixed:** `#C4A265` gold still used site-wide in 12 files
(WishlistButton/Drawer, VideoShowcaseNudge, ProactiveChatTrigger, MediaKit,
SmartRedirect, BlogIndex, FaqPage, AboutUs, CarValuation, blogPosts.ts,
remotion/types.ts) — out of scope for the documented VehicleLanding/Home fix.
MediaKit.tsx treats it as an intentional brand-kit swatch. Needs Jerry's call,
not a unilateral rewrite.

Verification each round: `npm run build` clean (599.1kb), `tsc --noEmit` 12
pre-existing errors (unchanged count via git-stash comparison), `vitest run`
892✓/46✗ (46 pre-existing DB-dependent, unchanged baseline).

## NEXT ACTION
Watch PR #104 for CI/review activity (none configured/none yet as of last
check — no CI runs on PRs in this repo). ~1hr self check-in scheduled. When it
merges + deploys: manual click-through recommended (search 豐田/休旅, vehicle-
context chat, operator round-trip) since all fixes were verified against mock
data, not live production data. Separately: ask Jerry whether the 12-file gold
cleanup should happen and in which pages.

## Open Blockers

- Railway auto-deploy unreliable (manual redeploy needed sometimes — not our code)
- Dashboard UI for admin mutations not built (backend ready; LINE coverage OK for MVP)
- Site-wide `#C4A265` gold cleanup (12 files) — awaiting Jerry's scope decision

## Key Knowledge

- **Polling vs WebSocket**: Chose polling (3s interval) for MVP simplicity — HTTP more reliable across proxies, connection mgmt overhead not worth it yet
- **Memory extraction pattern**: Detect budget/brand/visitTime in message → update DB fields → build "【客人已知資訊】" prompt section → gate re-asks in ruleBasedReply
- **aiDisabled gate exemptions**: Deterministic widgets (FAQ, photos, rich-menu, datetimepicker) bypass the gate; only LLM output is locked
- **Cloud sandbox firewall**: Blocks Railway, 8891, non-GitHub SaaS. Cannot test deploy status from here
- **Family context**: Jerry's father (70) uses phone, Megan (second operator) onboarding in progress
- **Stack**: Node/Express/Drizzle/MySQL + Gemini 2.5 Flash + LINE + 8891 sync

## Deployed + Working

- Permanent AI lockout (`aiDisabled` column)
- In-LINE operator controls (/lock, /unlock, /list, /whoami, /help, /status)
- Postback takeover buttons on notification cards
- Phantom-vehicle guardrail (prompt + output validator + fallback)
- Fact Lock (shopConfig single source of truth)
- Real-time polling (useMessages.ts, 3s interval) + SSE token streaming (both
  now confirmed correctly wired, see bugs 2-4 above)
