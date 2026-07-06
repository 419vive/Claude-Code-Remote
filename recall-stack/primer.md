# Active Project: 崑家汽車 (Kunjia Autos) — LINE chatbot + admin dashboard

Branch: `claude/kunjiia-menu-buttons-issue-nt0re1` (5 commits ahead of origin, pushed 2026-07-06 14:20 UTC).

Latest (2026-07-06): **Phase 2 complete + Phase 3 streaming/polling foundation shipped**.

**PHASE 2 COMPLETE** (Haiku + Sonnet agents all done):
- Rich-menu button fixes: locked convos still show FAQ chips, photos, carousels (early gate exemptions)
- Search sorting + Chinese synonyms (豐田→Toyota, 休旅→SUV, etc.)
- Vehicle context passthrough: chat knows which car visitor was viewing
- VehicleLanding design overhaul: removed 8891 gold (#C4A265), use design tokens only, rebranded "8891嚴選" → "崑家認証車況"
- Simple Q fast-track: 里程多少 → DB lookup <500ms, skip Gemini
- **Tests**: 837✓/46✗ (46 pre-existing DB-dependent)
- **Build**: 577kb clean

**PHASE 3 IN PROGRESS** (4 Opus agents running, streaming + memory mostly done):
1. **Web P0-2**: Real-time human reply architecture → useMessages.ts polling hook (3s interval, delta-fetching, dedup) ✓
2. **Web P1-2**: Streaming completion → chatStreamRouter.ts (/api/chat/stream SSE), llm.ts async generator, Chat.tsx consumer ✓
3. **LINE P1-5**: Memory system → customerMemoryExtractor.ts (extract), DB schema extended (persist), dynamicPromptBuilder injection (gate) ✓
4. **LINE P0-3**: Trade-in photo context awareness (photo trigger + trade-in scope awareness) [still running]

**Commits today:**
- 2efec90: Conversation memory + streaming polish (memory tests aligned, chatHistoryRouter, useMessages integration)
- cb3aa83: Project memory docs (web streaming completion)
- d494581: Phase 3 foundation (useMessages, chatStreamRouter, Chat polling integration)
- 3ddaace: VehicleLanding design compliance
- ff5bef9: Web chat context passthrough
- e2dbc84: Search 0-results escape routes

## Next Action

Wait for 4 remaining Opus agents to complete (expected within hours). When they notify:
1. Review & commit their work
2. Push to origin
3. **Deploy to Railway + live test**:
   - Streaming: first token <500ms (not 2-5s blocking)
   - Polling: operator replies appear ~3s
   - Memory: no re-asks of preferences (budget/brand/visit-time)
   - Photo context: trade-in photos load without "no car" false positive

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
