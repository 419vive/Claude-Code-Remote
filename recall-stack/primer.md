# Active Project: 崑家汽車 (Kunjia Autos) — LINE chatbot + admin dashboard + video studio

Branch: `claude/ai-video-editing-guide-kUVo4` (video studio scaffold, uncommitted at session end)
Main: all 2026-04-16 chatbot features live in production, 81/81 tests green.

## In Progress (end of 2026-04-21 session) — Video Studio

Built TWO pipelines on top of existing Remotion + Gemini + VideoDB stack. Nothing parallel.

**Part A — IG → vehicle page / chatbot (scaffolded, NOT yet wired to DB):**
- `scripts/ig-sync/download_ig_videos.py` — yt-dlp Phase 1 for `@mrlai_gogoya` (Jerry's sister, public IG). Phase 2 upgrade path (Graph API) documented.
- `scripts/ig-sync/match_to_vehicle.ts` — caption → vehicle row matcher. Writes `match-plan.json` for human review. `--apply` deliberately NOT connected to DB writes (fraud risk).

**Part B — AI podcast studio (scaffolded, render not yet run):**
- `scripts/podcast/episodes/ep01-road-rage/script.json` — 8 chapters, kai (`Puck`) + wen (`Kore`), ~300s estimated. Topic: 路怒心理學.
- `scripts/podcast/generate_voices.py` — Gemini 2.5 TTS per-line WAVs + `timing.json`.
- `scripts/podcast/generate_portraits.py` — Gemini image gen 寫實 portraits → `public/podcast/portraits/`.
- `client/src/remotion/compositions/PodcastRoadRage.tsx` — renders ANY `PodcastScript`-shaped episode (name historical).
- `scripts/podcast/render-podcast.ts` — ffmpeg concat + pick most-expensive vehicle + Remotion render.
- Registered `Podcast` composition in `Root.tsx` with `calculateMetadata` hook.
- `types.ts` extended with Podcast* interfaces.
- Cost per 5-min ep: ~$2.60 USD.
- Full docs: `docs/PODCAST-STUDIO.md`.

## Exact Next Action (for Jerry)

Commit + push current branch; then run locally:

```bash
pip install -r kun-auto-chatbot/scripts/podcast/requirements.txt
brew install ffmpeg
cd kun-auto-chatbot && npm run dev &
python scripts/podcast/generate_portraits.py ep01-road-rage
# edit script.json hosts.*.portraitUrl
python scripts/podcast/generate_voices.py ep01-road-rage
npx tsx scripts/podcast/render-podcast.ts ep01-road-rage
# → output/podcast/ep01-road-rage.mp4 (~15-25 min first run)
```

## Open Blockers

- Part A `--apply` not wired to DB (needs VideoDB upload + admin API PATCH)
- Part A Phase 2 Graph API needs sister OAuth-grant
- `VehicleVideoPlayer.tsx` still only plays Remotion photo showcase; needs branch for real MP4
- Railway auto-deploy still unreliable (from 2026-04-16)
- Megan onboarding: add her userId to `LINE_OPERATOR_USER_IDS` env on Railway

## Key Knowledge (video studio specific)

- **Video brand tokens** = `#C4A265` gold + `#0a0a0a` dark + Noto Sans TC (`KUNJIA_BRAND` in `client/src/remotion/types.ts`). Distinct from dashboard's navy (DESIGN.md).
- **`PodcastRoadRage.tsx` is episode-agnostic** — new episode = new `script.json` only, do NOT duplicate the tsx.
- **Featured vehicle is dynamic** — most-expensive available via tRPC at render time. If sold, swap with `--vehicle-id` or re-render.
- **Gemini is the ONLY new AI dep** — TTS + images both go through existing `GEMINI_API_KEY`. No OpenAI/Azure/ElevenLabs.
- **IG raw files NEVER commit** — `scripts/ig-sync/.gitignore` excludes `ig-raw/` + `match-plan.json`.
- **Output MP4s NEVER commit** — `output/.gitignore` excludes everything.

## Key Knowledge (unchanged from 2026-04-16)

- Production: Nixpacks ignores Dockerfile → migrations MUST live in `server/_core/index.ts runMigrations()`.
- LINE webhook doesn't receive OA-Manager outbound; operator signals via inbound (button tap or slash cmd).
- `aiDisabled=1` permanent vs `status='human_handoff'` temporary (30-min).
- Operator whitelist = union of `LINE_OPERATOR_USER_IDS` + `LINE_OWNER_USER_ID` + `LINE_ADDITIONAL_NOTIFY_USER_IDS`.
- Memory priority: MCP `memory_*` → `docs/PROJECT_JOURNAL.md` → `recall-stack/primer.md` → `CLAUDE.md`.
