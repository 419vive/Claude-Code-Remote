# Active Project: 崑家汽車 (Kunjia Autos) — LINE chatbot + admin dashboard

Branch: `claude/kunjiia-menu-buttons-issue-nt0re1` (reset off latest main 2026-07-06,
prior lineage — PR #102/#103 — already merged & deployed). PR #104 open (draft),
subscribed to activity, ~1hr self check-in scheduled.

Latest (2026-07-06): Phase 2+3 deployed to Railway + confirmed live. Ran the
7-item RAILWAY_DEPLOY_CHECKLIST verification (sandbox can't reach Railway/
kuncar.tw — reconfirmed 403 CONNECT tunnel — so verified each item at the
code level instead of asking Jerry to click through). **Found + fixed 5 real
bugs, all pushed to PR #104:**

1. Chinese synonym search (豐田/休旅/越野/軍用) returned zero results —
   capitalized synonym value never lowercased before case-sensitive `.includes()`.
2. Vehicle context passthrough silently dead on `/api/chat/stream` —
   `vehicleContext` destructured but never used.
3. SSE streaming buffered by gzip — no compression exemption for
   `/api/chat/stream` (added, matching `/api/line/webhook`'s pattern).
4. Operator polling latency doubled after every new message — `fetchMessages`
   depended on `messages` state, resetting the poll interval each time.
5. **Web chat "no reply" bug** (Jerry live-reported mid-review): the
   `[HUMAN_HANDOFF]` internal marker leaked to the customer because raw
   tokens streamed to the client before server-side stripping ran — fixed
   with a sliding-window buffer (verified against 6 token-split scenarios).
   Also redesigned the fallback per Jerry's direction: hard/uncertain
   questions now redirect the customer to official LINE (`SHOP_LINE_ID`)
   instead of the old "wait, a human will reply here" (which never actually
   notified anyone on this endpoint and the client didn't even render).
   Dropped the now-pointless `aiDisabled` lock for this path.

Rich-menu-while-locked and trade-in-photo-context items: verified correct by
direct code reading, no bugs found.

**Gold `#C4A265` cleanup — done.** Asked Jerry via AskUserQuestion; he chose
"customer-commonly-seen pages only." Fixed 7 files (WishlistButton/Drawer,
VideoShowcaseNudge, ProactiveChatTrigger, CarValuation, FaqPage,
SmartRedirect) to `bg-primary`/`text-primary`/`border-primary`. Left
MediaKit.tsx (documented brand-kit swatch), AboutUs, BlogIndex, blogPosts.ts,
remotion/ untouched (press/content, out of scope).

Verification each round: `npm run build` clean (600.6kb), `tsc --noEmit` 12
pre-existing errors (unchanged via git-stash comparison), `vitest run`
892✓/46✗ (unchanged baseline throughout every commit).

## NEXT ACTION
Watch PR #104 for CI/review activity (none configured/none yet — no CI runs
on PRs in this repo). ~1hr self check-in scheduled. When it merges + deploys:
manual click-through recommended (search 豐田/休旅, vehicle-context chat,
operator round-trip, gold-cleanup visual pass, and a genuinely hard question
to confirm the new LINE-redirect message reads naturally) — everything so
far was verified at the code level, not against live production/the real
Gemini model's actual phrasing.

## Open Blockers

- Railway auto-deploy unreliable (manual redeploy needed sometimes — not our code)
- Dashboard UI for admin mutations not built (backend ready; LINE coverage OK for MVP)
- Legacy `routers.ts` chat.send mutation still has the old "wait for web
  handoff" prompt — not fixed (dead code, `Chat.tsx` doesn't call it), but
  flagged in case anything switches back to it

## Key Knowledge

- **Polling vs WebSocket**: Chose polling (3s interval) for MVP simplicity — HTTP more reliable across proxies, connection mgmt overhead not worth it yet
- **Web handoff philosophy (NEW 2026-07-06)**: web chat has no reliable human-in-the-loop, so hard questions redirect to official LINE rather than waiting for a web operator that may never see it
- **aiDisabled gate exemptions**: Deterministic widgets (FAQ, photos, rich-menu, datetimepicker) bypass the gate; only LLM output is locked. Note: `/api/chat/stream` doesn't check aiDisabled at all — it's LINE-only enforcement.
- **Cloud sandbox firewall**: Blocks Railway, 8891, non-GitHub SaaS. Cannot test deploy status from here
- **Family context**: Jerry's father (70) uses phone, Megan (second operator) onboarding in progress
- **Stack**: Node/Express/Drizzle/MySQL + Gemini 2.5 Flash + LINE + 8891 sync

## Deployed + Working

- Permanent AI lockout (`aiDisabled` column, LINE channel only)
- In-LINE operator controls (/lock, /unlock, /list, /whoami, /help, /status)
- Postback takeover buttons on notification cards
- Phantom-vehicle guardrail (prompt + output validator + fallback)
- Fact Lock (shopConfig single source of truth)
- Real-time polling (useMessages.ts, 3s interval) + SSE token streaming, both
  confirmed correctly wired + latency-fixed this session
- Web chat hard-question fallback: redirect to official LINE (no web-side
  human handoff)
