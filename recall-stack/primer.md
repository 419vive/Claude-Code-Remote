# Active Project: 崑家汽車 (Kunjia Autos) — LINE chatbot + admin dashboard

Branch: `claude/integrate-tribe-v2-8jJ9v`
Latest commit: `def2e19` (docs: add PROJECT_JOURNAL.md as unbreakable memory fallback)

## Completed This Session

- **TRIBE v2 personal research sandbox** (Path B, CC-BY-NC — non-commercial only)
  - `scripts/tribe-sandbox/setup.sh` — venv + tribev2 clone + deps
  - `scripts/tribe-sandbox/run_preflight.py` — single-creative runner (video/audio/text → fsaverage5 cortical heatmaps)
  - `scripts/tribe-sandbox/compare.py` — A/B compare two creatives, with image→held-MP4 ffmpeg workaround
  - Commits: `d9a6d8e`, `747f983`
- **`docs/PROJECT_JOURNAL.md`** — unbreakable markdown memory fallback layer (commit `def2e19`)
- **Memory infrastructure audit** — confirmed `@claude-flow/memory` npm package missing, hook stdin broken, but MCP `memory_*` tools work and are now being used
- **CLAUDE.md updated** — added `@recall-stack/primer.md` import + "Memory System Behavior" behavioral contract section
- **MCP memory seeded** — 4 entries in namespace `project-kunjia-autos`: license constraint, Path B decision, hardware constraint, creative-review rubric

## Exact Next Step

**Wait for Jerry to drop a creative** (image/video/text) for Path 2 conversational review. No code needed — apply the 6-dim rubric (Hook / Price / Trust / CTA / Buyer-fit / Composition, 1-5 each, SHIP ≥24 / FIX 18-23 / KILL <18) using Claude's multimodal vision directly in chat.

## Open Blockers

- **No GPU available**: Jerry has iPhone + 10yr-old MacBook Pro. Claude sandbox also has no GPU. TRIBE v2 sandbox is shipped and correct but unusable until GPU access (Colab / HF Spaces / rented GPU). Deferred indefinitely.
- **Broken memory layers** (deferred to separate focused session): `@claude-flow/memory` npm install, hook stdin bug in `pending-insights.jsonl`, `session.restore()` returning "No session to restore".

## Key Knowledge

- **TRIBE v2** = Meta FAIR Trimodal Brain Encoder (March 2026, CC-BY-NC-4.0). API: `TribeModel.from_pretrained("facebook/tribev2")`, supports `video_path`/`audio_path`/`text_path`, NO `image_path` (image workaround = ffmpeg held MP4 through V-JEPA2 backbone, unofficial).
- **License constraint** = TRIBE v2 outputs CANNOT drive commercial ad/content decisions for 崑家汽車. Personal research only. Sandbox is isolated from production by design.
- **Path A deferred**: Gemini-based commercial creative reviewer in admin dashboard, with `creativeReviews` table. Commercially clean but waits for Path 2 validation.
- **Production stack**: TypeScript/Node/Express/Drizzle/MySQL + Gemini 2.5 Flash + LINE webhook + 8891.tw sync.
- **Memory layer priority**: MCP `memory_*` tools → `docs/PROJECT_JOURNAL.md` → `recall-stack/primer.md` → `CLAUDE.md` files.
- **Before UI work**: read `kun-auto-chatbot/docs/DESIGN.md` (shadcn/ui + Tailwind v4 + oklch tokens, deep navy single accent, 10px radius, `tabular-nums` on prices).
