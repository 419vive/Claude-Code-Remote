# AI Character Skit Video Pipeline — Setup

Turns a natural-language brief into a 5-minute AI character skit with:
- Locked-identity characters (Higgsfield Soul ID)
- Real car product placement (Kling Multi-Elements + vehicles DB)
- Pro Mandarin voice-over (ElevenLabs)
- Commercial-licensed music (Suno)
- Bilingual word-level subtitles (WhisperX)
- Deterministic final assembly (FFmpeg)

## Recommended tier quickstart ($142/mo, 15 × 5-min videos)

1. **Subscribe** (create account, save API keys):
   - Higgsfield **Ultimate** — $29/mo — https://higgsfield.ai/pricing
   - Kling **Premier** — $64.99/mo — https://klingai.com/global/dev/pricing
   - Seedance via **PiAPI** (pay-per-use ~$15-25/mo) — https://piapi.ai
   - ElevenLabs **Creator** — $22/mo — https://elevenlabs.io/pricing
   - Suno via **PiAPI** — $10/mo effective — https://piapi.ai

2. **Train your recurring characters on Higgsfield** (one-time $3 each):
   - Upload 20+ photos per character to Higgsfield
   - Copy the returned Soul ID
   - Paste into `config/characters.json` (see `config/characters.example.json`)

3. **Install FFmpeg + WhisperX** (for assembly + subtitles):
   ```bash
   brew install ffmpeg        # or: apt install ffmpeg
   pip install whisperx
   ```

4. **Set env vars** in `kun-auto-chatbot/.env` (see section below).

5. **Verify**:
   ```bash
   cd kun-auto-chatbot
   npx tsx scripts/create-video.ts --health
   ```

6. **Dry run your first brief** (zero cost):
   ```bash
   npx tsx scripts/create-video.ts \
     --brief "兩個角色辯論BMW X1 vs Toyota Corolla Cross,穿插崑家現車畫面" \
     --vehicle-id 1 \
     --dry-run
   ```

7. **Go live** when the dry run looks right.

## One-time setup

### 1. Environment variables

Add these to your `.env` (at `kun-auto-chatbot/.env`). You don't need them all —
the registry auto-picks whichever provider you have configured. But music and
TTS are **mandatory** for commercial output.

```bash
# === Video providers — set at least one ===
LUMA_API_KEY=                    # https://lumalabs.ai/api — $0.24-0.71 per 720p 5s clip
LUMA_MODEL=ray-2-flash           # or ray-2 for max quality

HIGGSFIELD_API_KEY=              # https://higgsfield.ai/pricing — $29/mo Ultimate
HIGGSFIELD_TIER=ultimate         # basic | ultimate | creator

SEEDANCE_API_KEY=                # via PiAPI: https://piapi.ai — ~$0.022/sec
SEEDANCE_ENDPOINT=               # leave blank to use PiAPI default
SEEDANCE_RATE_USD_PER_SEC=0.022

KLING_API_KEY=                   # https://klingai.com/global/dev — $64.99/mo Premier
KLING_ACCESS_KEY=
KLING_MODE=std                   # std | pro (pro costs ~2x more credits)

# === Audio — mandatory for 5-minute skits ===
ELEVENLABS_API_KEY=              # $22/mo Creator tier = 100K chars
ELEVENLABS_VOICE_ID=             # optional — specific Taiwanese Mandarin voice
SUNO_API_KEY=                    # via PiAPI — $10/mo for Suno Pro commercial rights

# === Self-hosted fallbacks (free, optional) ===
FISH_SPEECH_URL=                 # http://localhost:8080 — self-hosted TTS
ACE_STEP_URL=                    # http://localhost:8081 — self-hosted music
```

### 2. Verify configuration

```bash
npx tsx scripts/create-video.ts --health
```

### 3. Dry-run a video without spending a cent

```bash
npx tsx scripts/create-video.ts \
  --brief "兩個角色辯論BMW X1 vs Toyota Corolla Cross, 最後主持人推薦崑家汽車" \
  --duration 300 \
  --dry-run
```

This prints the shot list and estimated cost. No API calls.

### 4. Live run

```bash
npx tsx scripts/create-video.ts \
  --brief "Two characters review the 2019 BMW X1 at Kunjia Autos" \
  --duration 300 \
  --vehicle-id 1 \
  --language zh-TW,en
```

## Monthly cost at 15 videos × 5 min

| Config        | Providers                                          | Monthly |
| ------------- | -------------------------------------------------- | ------- |
| Lean          | Seedance (PiAPI) + ElevenLabs + local BGM          | $65     |
| Recommended   | Higgsfield Ultimate + Seedance + ElevenLabs + Suno | $113    |
| Premium       | Higgsfield Creator + Kling Premier + both          | $222    |

Plus one-time: $3-9 for Higgsfield Soul ID character training.

## Architecture

```
brief (natural language)
    ↓
script-builder.ts  ── Claude → Script (30-40 shots, characters, dialogue, product inserts)
    ↓
orchestrator.ts    ── Dispatch each shot to best provider
    ↓
providers/*.ts     ── Luma / Higgsfield / Seedance / Kling (parallel, bounded concurrency)
    ↓
audio.ts           ── ElevenLabs voice-over + Suno music + WhisperX subtitles
    ↓
assembler (Remotion/FFmpeg) ── final MP4
```

## Character management

Characters are stored with per-provider locked IDs. After initial training on
Higgsfield (20 photos, ~$3, ~5 minutes), the Soul ID is cached in the `Character.lockedIn`
map and reused across every future video, guaranteeing the same face appears.

## Product placement flow

1. User brief mentions "include the 2019 BMW X1 from inventory"
2. Script builder loads vehicle row from the `vehicles` table
3. Shot generation passes the car's `heroPhotoUrl` + the character Soul ID to Kling
4. Kling Multi-Elements composites both references into one coherent shot
5. Output: AI character walking past the REAL car from dad's lot

## Assembly note

Final MP4 stitching is left as a Remotion composition hook — the orchestrator
writes a `final.manifest.json` with all clip/audio paths. Extend
`server/video-pipeline/orchestrator.ts` → `assembleFinalVideo()` when you want
fully-automated stitching.
