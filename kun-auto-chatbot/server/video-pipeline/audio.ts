/**
 * Audio pipeline for the video orchestrator.
 *
 * Three concerns, one file:
 *   1. TTS (voice-over + skit dialogue)  → ElevenLabs primary, Fish-Speech fallback
 *   2. Music (BGM)                        → Suno via PiAPI primary, local file fallback
 *   3. Subtitles                          → WhisperX on CPU (word-level ZH-TW + EN)
 *
 * All three are mandatory for a commercial 5-minute skit. Music is NOT an
 * afterthought — a skit without music feels amateur, so the default music
 * generator always runs (Suno → ACE-Step → local file fallback).
 */
import fs from "node:fs/promises";
import path from "node:path";

export interface TTSParams {
  text: string;
  language: string; // "zh-TW", "en"
  voiceId?: string; // provider-specific voice identifier
  outputPath: string;
}

export interface MusicParams {
  prompt: string; // Mood/genre/tempo prompt
  durationSec: number;
  outputPath: string;
}

export interface SubtitleParams {
  audioPath: string; // path to the voice-over audio file
  language: string;
  outputVttPath: string;
}

export interface AudioResult {
  path: string;
  durationSec: number;
  costUsd: number;
  provider: string;
}

/* =========================================================================
   TTS — Text-to-Speech
   ========================================================================= */

/**
 * ElevenLabs TTS — pro-quality Mandarin (Taiwan) narration.
 *
 * Pricing (April 2026):
 *   Starter:  $5/mo   30K chars   (too small for 15 × 5-min videos)
 *   Creator:  $22/mo  100K chars  ← recommended
 *   Pro:      $99/mo  500K chars  (scale-up tier)
 */
const ELEVENLABS_API = "https://api.elevenlabs.io/v1";

export async function ttsElevenLabs(params: TTSParams): Promise<AudioResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");

  const voiceId = params.voiceId ?? process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";

  const res = await fetch(`${ELEVENLABS_API}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text: params.text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);

  const audio = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(params.outputPath), { recursive: true });
  await fs.writeFile(params.outputPath, audio);

  // Creator tier: $22 / 100K chars = $0.00022/char
  const costUsd = params.text.length * 0.00022;
  return { path: params.outputPath, durationSec: 0, costUsd, provider: "elevenlabs" };
}

/**
 * Fish-Speech self-hosted fallback — Apache 2.0, Chinese-optimized, $0 per call.
 * Expected to be running at FISH_SPEECH_URL (Docker container or remote server).
 */
export async function ttsFishSpeech(params: TTSParams): Promise<AudioResult> {
  const baseUrl = process.env.FISH_SPEECH_URL;
  if (!baseUrl) throw new Error("FISH_SPEECH_URL not set");

  const res = await fetch(`${baseUrl}/v1/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: params.text, language: params.language, format: "mp3" }),
  });
  if (!res.ok) throw new Error(`Fish-Speech ${res.status}: ${await res.text()}`);

  const audio = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(params.outputPath), { recursive: true });
  await fs.writeFile(params.outputPath, audio);
  return { path: params.outputPath, durationSec: 0, costUsd: 0, provider: "fish-speech" };
}

/* =========================================================================
   MUSIC — Background music generation
   ========================================================================= */

/**
 * Suno via PiAPI — highest-quality licensed music, commercial rights included.
 *
 * Pricing (April 2026):
 *   Suno Pro:      $10/mo   500 generations   ← recommended
 *   Suno Premier:  $30/mo   2000 generations
 *
 * Access through PiAPI wrapper for clean API — Suno has no official public API.
 */
const SUNO_API = "https://api.piapi.ai/api/v1/task";

export async function musicSuno(params: MusicParams): Promise<AudioResult> {
  const apiKey = process.env.SUNO_API_KEY;
  if (!apiKey) throw new Error("SUNO_API_KEY not set");

  const submit = await fetch(SUNO_API, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "music-u",
      task_type: "generate_music",
      input: {
        gpt_description_prompt: params.prompt,
        make_instrumental: true,
        mv: "chirp-v4",
      },
    }),
  });
  if (!submit.ok) throw new Error(`Suno submit ${submit.status}: ${await submit.text()}`);
  const { task_id } = (await submit.json()) as { task_id: string };

  // Poll
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5_000));
    const res = await fetch(`${SUNO_API}/${task_id}`, { headers: { "x-api-key": apiKey } });
    const json = (await res.json()) as {
      status: string;
      output?: { clips?: Array<{ audio_url: string }> };
    };
    if (json.status === "completed" && json.output?.clips?.[0]?.audio_url) {
      const audio = Buffer.from(
        await (await fetch(json.output.clips[0].audio_url)).arrayBuffer(),
      );
      await fs.mkdir(path.dirname(params.outputPath), { recursive: true });
      await fs.writeFile(params.outputPath, audio);
      // Suno Pro: $10/500 = $0.02 per generation
      return { path: params.outputPath, durationSec: params.durationSec, costUsd: 0.02, provider: "suno" };
    }
    if (json.status === "failed") throw new Error("Suno generation failed");
  }
  throw new Error("Suno generation timeout");
}

/**
 * ACE-Step self-hosted — Apache 2.0, runs on consumer GPU, beats most commercial.
 * $0 per call. Expected running at ACE_STEP_URL.
 */
export async function musicAceStep(params: MusicParams): Promise<AudioResult> {
  const baseUrl = process.env.ACE_STEP_URL;
  if (!baseUrl) throw new Error("ACE_STEP_URL not set");

  const res = await fetch(`${baseUrl}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: params.prompt, duration: params.durationSec, format: "mp3" }),
  });
  if (!res.ok) throw new Error(`ACE-Step ${res.status}: ${await res.text()}`);
  const audio = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(params.outputPath), { recursive: true });
  await fs.writeFile(params.outputPath, audio);
  return { path: params.outputPath, durationSec: params.durationSec, costUsd: 0, provider: "ace-step" };
}

/**
 * Local file fallback — always works, always free.
 * Uses the committed bgm-upbeat.mp3 as a last-resort BGM source.
 */
export async function musicLocalFallback(params: MusicParams): Promise<AudioResult> {
  const fallback = path.resolve("./client/public/audio/bgm-upbeat.mp3");
  await fs.access(fallback); // throws if missing
  await fs.mkdir(path.dirname(params.outputPath), { recursive: true });
  await fs.copyFile(fallback, params.outputPath);
  return { path: params.outputPath, durationSec: params.durationSec, costUsd: 0, provider: "local-bgm" };
}

/**
 * Music orchestrator — cascading fallback chain.
 * Tries Suno → ACE-Step → local file. Never fails unless local file is missing.
 */
export async function generateMusic(params: MusicParams): Promise<AudioResult> {
  if (process.env.SUNO_API_KEY) {
    try {
      return await musicSuno(params);
    } catch (err) {
      console.warn("[music] Suno failed, falling back:", (err as Error).message);
    }
  }
  if (process.env.ACE_STEP_URL) {
    try {
      return await musicAceStep(params);
    } catch (err) {
      console.warn("[music] ACE-Step failed, falling back:", (err as Error).message);
    }
  }
  return musicLocalFallback(params);
}

/* =========================================================================
   SUBTITLES — WhisperX word-level timestamps (local CPU/GPU)
   ========================================================================= */

/**
 * WhisperX wrapper — assumes `whisperx` CLI is installed locally.
 *   pip install whisperx
 * Handles ZH-TW + EN, generates .vtt for direct Remotion/FFmpeg embedding.
 * $0 per call (runs on your machine).
 */
export async function generateSubtitles(params: SubtitleParams): Promise<AudioResult> {
  const { spawn } = await import("node:child_process");
  const outDir = path.dirname(params.outputVttPath);
  await fs.mkdir(outDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const proc = spawn("whisperx", [
      params.audioPath,
      "--language",
      params.language,
      "--output_dir",
      outDir,
      "--output_format",
      "vtt",
      "--model",
      "large-v3",
    ]);
    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    proc.on("close", (code: number) => {
      if (code === 0) {
        resolve({ path: params.outputVttPath, durationSec: 0, costUsd: 0, provider: "whisperx" });
      } else {
        reject(new Error(`whisperx exited ${code}: ${stderr}`));
      }
    });
  });
}
