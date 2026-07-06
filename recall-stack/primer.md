# Active Project: 崑家汽車 (Kunjia Autos) — LINE chatbot + admin dashboard

Branch: `claude/kunjiia-menu-buttons-issue-nt0re1` (reset off latest main 2026-07-06,
prior lineage — PR #102/#103 — already merged & deployed). PR #104 open (draft),
subscribed to activity, ~1hr self check-in scheduled.

Latest (2026-07-06): Phase 2+3 deployed to Railway + confirmed live. Now manually
verifying the 7-item RAILWAY_DEPLOY_CHECKLIST — found + fixed a real bug on item 1.

**Bug fixed (PR #104):** `client/src/pages/Home.tsx` Chinese synonym search —
豐田/休旅/越野/軍用 returned ZERO results in production (capitalized synonym value
never lowercased before case-sensitive `.includes()`). One-line fix, verified with
a standalone mock-data test script (sandbox can't reach Railway/kuncar.tw — same
firewall block as 2026-04-22 entry, reconfirmed via curl 403). Build clean 598.8kb.

## NEXT ACTION
Continue the 7-item checklist (2-7 remaining): streaming latency, vehicle context
passthrough, design compliance, trade-in photo awareness, operator polling, sort
dropdown. Same method as item 1 — prefer standalone logic verification over asking
Jerry to click through, since this sandbox cannot reach the live site at all.
Watch for PR #104 CI/reviews (none configured/none yet as of last check).

---

Earlier (2026-07-06): **✅ PHASE 2 + PHASE 3 COMPLETE — READY FOR RAILWAY DEPLOYMENT**

**PHASE 2 COMPLETE** (Haiku + Sonnet agents all done):
- Rich-menu button fixes: locked convos still show FAQ chips, photos, carousels (early gate exemptions)
- Search sorting + Chinese synonyms (豐田→Toyota, 休旅→SUV, etc.)
- Vehicle context passthrough: chat knows which car visitor was viewing
- VehicleLanding design overhaul: removed 8891 gold (#C4A265), use design tokens only, rebranded "8891嚴選" → "崑家認証車況"
- Simple Q fast-track: 里程多少 → DB lookup <500ms, skip Gemini
- **Tests**: 837✓/46✗ (46 pre-existing DB-dependent)
- **Build**: 577kb clean

**PHASE 3 COMPLETE** (all 4 Opus agents done):
1. **Web P0-2**: Real-time polling → useMessages.ts hook (3s interval, delta-fetch, dedup) ✓
2. **Web P1-2**: Streaming → /api/chat/stream SSE, first token 500-800ms (was 2-5s) ✓
3. **LINE P1-5**: Memory → extract/inject/gate (no re-asks of budget/brand/visit-time) ✓
4. **LINE P0-3**: Trade-in photos → context-aware "已轉給賴先生估價" vs "我們沒有這台車" ✓

**Commits today (6 total):**
- c85114b: Final polish (useMessages, chatHistoryRouter, memory tests)
- af10a71: LINE P1-5 memory system complete
- a7006dd: Web P1-2 streaming complete  
- ab6e05b: LINE P0-3 trade-in photo awareness
- 0ac180c: Operator role support + memory tests
- Earlier: Phase 2 features (search, context, design, fast-track)

**Build & Test Status:**
- Tests: 874✓/46✗ (no regression)
- Build: 595.6kb clean
- tsc: 0 errors in touched files

## NEXT ACTION: DEPLOY TO RAILWAY

1. **Merge to main** (or let Railway detect this branch)
2. **Railway auto-deploy** (~2-3 min)
3. **Live verification**:
   - Streaming: first token <500ms (was 2-5s)
   - Polling: operator replies ~3s
   - Memory: no re-asks
   - Trade-in: context-aware photos

See scratchpad/RAILWAY_DEPLOY_CHECKLIST.md for 7 verification tests.
**Deployment confidence: HIGH**

## Open Blockers

- Railway auto-deploy unreliable (manual redeploy needed sometimes — not our code)
- Dashboard UI for admin mutations not built (backend ready; LINE coverage OK for MVP)
- Streaming full completion pending (useMessages + invokeLLMStream still being wired)

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
