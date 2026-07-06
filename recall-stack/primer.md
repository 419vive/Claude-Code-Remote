# Active Project: 崑家汽車 (Kunjia Autos) — LINE chatbot + admin dashboard

Branch: `claude/kunjiia-menu-buttons-issue-nt0re1` — **both PR #104 (sha
`0a67891`) and PR #105 (sha `cc81f53`) merged to main.** Next session picking
up work here should reset this branch fresh off origin/main again (same
convention as before) rather than stacking on merged history.

Latest (2026-07-06): **PR #104 merged.** Contained: search synonym fix,
vehicle-context-passthrough fix, SSE-compression fix, operator-polling
latency fix, web-chat handoff redesign (redirect hard questions to LINE
instead of "wait for a human"), and a gold→navy cleanup on 7 customer-facing
pages. Jerry manually verified search works.

**Then reverted: gold `#C4A265` restored on 7 files.** Jerry looked at the
gold-cleanup pages live and decided he prefers gold there (more eye-catching)
— reverted `WishlistButton.tsx`, `WishlistDrawer.tsx`, `VideoShowcaseNudge.tsx`,
`ProactiveChatTrigger.tsx`, `CarValuation.tsx`, `FaqPage.tsx`,
`SmartRedirect.tsx` back to their exact pre-cleanup gold values. This is a
deliberate, informed exception to DESIGN.md's "navy only" rule — not an
oversight. `VehicleLanding.tsx`/`Home.tsx` (the original design-compliance
fix) were NOT touched, still navy — Jerry didn't ask to revert those.

Verification: `npm run build` clean (600.6kb), `tsc --noEmit` 12 pre-existing
errors (unchanged), `vitest run` 892✓/46✗ (unchanged baseline) — confirmed
again after the revert too.

## NEXT ACTION
Both PRs merged — nothing left on GitHub. Waiting on Jerry to do a live
click-through once Railway finishes deploying: search 豐田/休旅,
vehicle-context chat, operator round-trip, a hard question to confirm the
LINE-redirect message, and a visual check that gold is back on the 7 pages.
Everything today was verified at the code level only (mock data / direct
reading) — never against live production, since this sandbox cannot reach
Railway/kuncar.tw by any means (confirmed with curl AND a real browser).

## Open Blockers

- Railway auto-deploy unreliable (manual redeploy needed sometimes — not our code)
- Dashboard UI for admin mutations not built (backend ready; LINE coverage OK for MVP)
- Legacy `routers.ts` chat.send mutation still has the old "wait for web
  handoff" prompt — not fixed (dead code, `Chat.tsx` doesn't call it), but
  flagged in case anything switches back to it
- Sandbox firewall confirmed (again) to block ALL outbound to Railway/kuncar.tw
  regardless of tool — tested via curl AND a real Playwright/Chromium browser
  launch, both hit the identical block (`ERR_TUNNEL_CONNECTION_FAILED` /
  403 CONNECT). Not a curl-specific limitation — genuinely cannot browse the
  live site from this environment, by any means.

## Key Knowledge

- **GitHub Actions "Deploy to Production" workflow is a dead scaffold** —
  its actual Railway/Render/VPS deploy steps are all commented out (just
  prints "uncomment a deploy step above to go live"). It only runs build +
  tsc as a validation gate. It has been failing on "Type check" since at
  least 2026-06-28 (pre-existing tsc errors, unrelated to any of today's
  work) — **this failure does NOT mean Railway didn't deploy**; Railway's
  actual deploy is a separate mechanism (its own GitHub integration/webhook)
  not represented anywhere in this repo's Actions workflows.
- **Web handoff philosophy**: web chat has no reliable human-in-the-loop, so
  hard questions redirect to official LINE rather than waiting for a web
  operator that may never see it.
- **Gold vs navy — the exception list**: `VehicleLanding.tsx`/`Home.tsx` =
  navy only (original design-compliance fix). Wishlist/VideoNudge/ChatTrigger/
  CarValuation/FAQ/SmartRedirect = gold is fine, Jerry's explicit call.
  MediaKit.tsx/AboutUs.tsx/BlogIndex.tsx/blogPosts.ts/remotion/ = never
  touched either direction.
- **aiDisabled gate exemptions**: Deterministic widgets (FAQ, photos,
  rich-menu, datetimepicker) bypass the gate on LINE; only LLM output is
  locked. `/api/chat/stream` (web) doesn't check aiDisabled at all.
- **Cloud sandbox firewall**: Blocks Railway, 8891, non-GitHub SaaS. Cannot
  test deploy status or browse the live site from here, by any tool.
- **Family context**: Jerry's father (70) uses phone, Megan (second operator)
  onboarding in progress
- **Stack**: Node/Express/Drizzle/MySQL + Gemini 2.5 Flash + LINE + 8891 sync

## Deployed + Working

- Permanent AI lockout (`aiDisabled` column, LINE channel only)
- In-LINE operator controls (/lock, /unlock, /list, /whoami, /help, /status)
- Postback takeover buttons on notification cards
- Phantom-vehicle guardrail (prompt + output validator + fallback)
- Fact Lock (shopConfig single source of truth)
- Real-time polling (useMessages.ts, 3s interval) + SSE token streaming, both
  latency-fixed 2026-07-06
- Web chat hard-question fallback: redirect to official LINE (no web-side
  human handoff)
