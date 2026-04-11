# Active Project: 崑家汽車 (Kunjia Autos) — LINE chatbot + admin dashboard

Branch: `claude/integrate-tribe-v2-8jJ9v`
Latest commit: graphify sandbox shipped + measured (4.5x token reduction on AST-only, not 71x)

## Completed This Session

- **Graphify sandbox** (`scripts/graphify-sandbox/`, Path A greenlit)
  - `setup.sh` — isolated venv, pinned `graphifyy==0.4.2`
  - `build_ast_graph.py` — Python driver that bypasses the CLI entirely,
    calls `graphify.extract` + `graphify.build` directly for **AST-only**
    extraction (zero LLM calls, deterministic, 2.5s build on 406 code files)
  - `build_graph.sh` — thin wrapper for venv activation
  - Declined: `graphify claude install`, `hook install`, `install`, and
    the semantic-extraction subagent pipeline (skill.md path)
  - Measurements: 5344 nodes / 8626 edges / 5.5MB graph.json
  - `graphify benchmark`: **4.5x average token reduction** (marketing
    claim is 71.5x — that requires full semantic extraction we declined)
- **Query verdict (3 real questions):**
  - Q2 "sync8891 + drizzle schema" → STRONG, found full function family
  - Q1 "LINE webhook handler" → WEAK, no matching node labels
  - Q3 "Gemini callers" → WEAK, "Gemini" is an import string, not an AST entity
- **Previous session carryover** (still valid):
  - TRIBE v2 sandbox at `scripts/tribe-sandbox/` (CC-BY-NC, non-commercial, GPU-blocked)
  - `docs/PROJECT_JOURNAL.md` unbreakable memory ledger
  - CLAUDE.md + recall-stack behavioral contract + MCP memory seeded

## Exact Next Step

**Wait for Jerry's decision.** The graphify experiment is complete with
honest numbers. Three forward paths:

1. **Keep sandbox, don't wire in.** AST-only is too weak for concept
   queries (LINE/Gemini/webhook) to replace grep. Sandbox sits idle,
   deletable at any time.
2. **Try one bounded semantic pass** with explicit cost cap — e.g., run
   graphify semantic extraction on ONLY the `kun-auto-chatbot/server/`
   directory (~30 files), measure Claude token cost, see if concept
   queries improve.
3. **Abandon graphify.** Delete `scripts/graphify-sandbox/`, call it a
   learning experiment, go back to grep.

Default: wait. No code until Jerry picks.

## Open Blockers

- **No GPU**: TRIBE v2 sandbox unusable until GPU access (Colab / HF Spaces / rented GPU). Deferred indefinitely.
- **Broken memory layers**: `@claude-flow/memory` npm package not installed, hook stdin parsing broken, `session.restore()` returning "No session to restore". Deferred to separate focused session.
- **Graphify concept-query quality**: AST-only can't bridge vocabulary gap ("webhook" vs `handleMessage`). Fix requires the semantic-extraction path we declined.

## Key Knowledge

- **Graphify CLI has NO `build` command.** Normal usage goes through the
  skill.md (`.claude/skills/graphify/SKILL.md`), which instructs an agent
  to spawn Claude subagents for semantic extraction. We bypass this via
  direct Python API (`graphify.extract.extract()` + `graphify.build.build()`).
- **Graphify install paths to AVOID**: `graphify claude install` (PreToolUse hook + CLAUDE.md mutation), `graphify hook install` (git hooks), `graphify install` (same as claude install).
- **TRIBE v2** = Meta FAIR Trimodal Brain Encoder (March 2026, CC-BY-NC-4.0). No `image_path` API — image workaround is ffmpeg-held MP4 through V-JEPA2. NON-commercial only — cannot drive ad decisions for 崑家汽車.
- **Path A (Gemini commercial creative reviewer in admin dashboard)** still deferred.
- **Production stack**: TypeScript/Node/Express/Drizzle/MySQL + Gemini 2.5 Flash + LINE webhook + 8891.tw sync.
- **Memory layer priority**: MCP `memory_*` tools → `docs/PROJECT_JOURNAL.md` → `recall-stack/primer.md` → `CLAUDE.md`.
- **Before UI work**: read `kun-auto-chatbot/docs/DESIGN.md` (shadcn/ui + Tailwind v4 + oklch tokens, deep navy single accent, 10px radius, `tabular-nums` on prices).
