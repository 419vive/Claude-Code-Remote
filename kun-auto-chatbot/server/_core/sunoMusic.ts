/**
 * Background music generation service — multi-backend.
 *
 * Supports two backends:
 *   1. Mubert API — AI-generated music, fully automated, ~$0.02-0.05/track
 *   2. Suno AI — via third-party wrapper (fallback)
 *
 * Priority: Mubert → Suno → skip BGM.
 */
import { ENV } from "./env";
import { logger } from "../logger";

const MUBERT_BASE_URL = "https://api-b2b.mubert.com/v2";
const MUBERT_POLL_INTERVAL_MS = 2_000;
const MUBERT_MAX_POLL_TIME_MS = 60_000; // 60 seconds

const SUNO_TIMEOUT_MS = 120_000;
const SUNO_POLL_INTERVAL_MS = 5_000;
const SUNO_MAX_POLL_TIME_MS = 180_000;

export type MusicGenerationInput = {
  /** Description of the music style/mood (English) */
  prompt: string;
  /** Duration in seconds */
  durationSec?: number;
  /** Whether instrumental only (default: true) */
  instrumental?: boolean;
};

export type MusicGenerationResult = {
  audioUrl: string;
  title: string;
  duration: number;
};

/**
 * Generate background music. Auto-selects available backend.
 */
export async function generateMusic(
  input: MusicGenerationInput
): Promise<MusicGenerationResult> {
  if (ENV.mubertApiKey) {
    return generateViaMubert(input);
  }
  if (ENV.sunoApiKey) {
    return generateViaSuno(input);
  }

  logger.warn("Music", "No music API configured (MUBERT_API_KEY or SUNO_API_KEY) — skipping BGM");
  return { audioUrl: "", title: "No BGM", duration: 0 };
}

// ─────────────────────────────────────────────────────────
// Mubert API — Primary (fully automated, AI-generated)
// ─────────────────────────────────────────────────────────

/** Map prompt keywords to Mubert tags */
function promptToTags(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  const tags: string[] = ["instrumental"];

  // Genre
  if (lower.includes("cinematic")) tags.push("cinematic", "epic");
  if (lower.includes("ambient")) tags.push("ambient", "atmospheric");
  if (lower.includes("lofi") || lower.includes("lo-fi")) tags.push("lofi", "chill");
  if (lower.includes("electronic")) tags.push("electronic");
  if (lower.includes("corporate")) tags.push("corporate", "uplifting");
  if (lower.includes("jazz")) tags.push("jazz");
  if (lower.includes("piano")) tags.push("piano");

  // Mood
  if (lower.includes("warm") || lower.includes("happy")) tags.push("happy", "warm");
  if (lower.includes("emotional") || lower.includes("touching")) tags.push("emotional", "dramatic");
  if (lower.includes("energetic") || lower.includes("upbeat")) tags.push("energetic", "upbeat");
  if (lower.includes("relaxing") || lower.includes("calm")) tags.push("relaxing", "calm");

  // Default if nothing matched
  if (tags.length <= 1) tags.push("cinematic", "calm", "corporate");

  return tags;
}

async function generateViaMubert(
  input: MusicGenerationInput
): Promise<MusicGenerationResult> {
  const duration = input.durationSec || 60;
  const tags = promptToTags(input.prompt);

  logger.info("Mubert", `Generating ${duration}s track [${tags.join(", ")}]...`);

  // 1. Submit
  const submitRes = await fetch(`${MUBERT_BASE_URL}/TTMRecordTrack`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      method: "TTMRecordTrack",
      params: {
        pat: ENV.mubertApiKey,
        duration,
        tags,
        mode: "track",
        maxit: 1,
        format: "mp3",
        bitrate: 320,
      },
    }),
  });

  if (!submitRes.ok) {
    const detail = await submitRes.text().catch(() => "");
    throw new Error(`Mubert submit failed (${submitRes.status}): ${detail.substring(0, 500)}`);
  }

  const submitData = (await submitRes.json()) as {
    status: number;
    result?: { track_id: string; url?: string; status: string };
    error?: { code: number; text: string };
  };

  if (submitData.error) {
    throw new Error(`Mubert error: ${submitData.error.text}`);
  }

  const trackId = submitData.result?.track_id;
  if (!trackId) {
    throw new Error("Mubert did not return a track_id");
  }

  // Already done? (short tracks)
  if (submitData.result?.status === "DONE" && submitData.result.url) {
    logger.info("Mubert", `Track ready (instant): ${trackId}`);
    return { audioUrl: submitData.result.url, title: "BGM", duration };
  }

  // 2. Poll
  const startTime = Date.now();
  while (Date.now() - startTime < MUBERT_MAX_POLL_TIME_MS) {
    await sleep(MUBERT_POLL_INTERVAL_MS);

    const pollRes = await fetch(`${MUBERT_BASE_URL}/TTMGetTrackInfo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "TTMGetTrackInfo",
        params: { pat: ENV.mubertApiKey, track_id: trackId },
      }),
    });

    if (!pollRes.ok) continue;

    const pollData = (await pollRes.json()) as {
      status: number;
      result?: { status: string; url?: string };
      error?: { text: string };
    };

    if (pollData.result?.status === "DONE" && pollData.result.url) {
      logger.info("Mubert", `Track ready: ${trackId}`);
      return { audioUrl: pollData.result.url, title: "BGM", duration };
    }

    if (pollData.result?.status === "ERROR") {
      throw new Error(`Mubert generation failed: ${pollData.error?.text || trackId}`);
    }
  }

  throw new Error(`Mubert timed out: ${trackId}`);
}

// ─────────────────────────────────────────────────────────
// Suno AI — Fallback (third-party wrapper)
// ─────────────────────────────────────────────────────────
async function generateViaSuno(
  input: MusicGenerationInput
): Promise<MusicGenerationResult> {
  const baseUrl = ENV.sunoBaseUrl;
  logger.info("Suno", `Generating music: "${input.prompt.substring(0, 60)}..."`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUNO_TIMEOUT_MS);

  try {
    const submitRes = await fetch(`${baseUrl}/api/v1/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.sunoApiKey}`,
      },
      body: JSON.stringify({
        customMode: true,
        instrumental: input.instrumental ?? true,
        model: "V5_5",
        style: input.prompt,
        title: "BGM",
        prompt: "",
        negativeTags: "vocals, singing, lyrics",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!submitRes.ok) {
      const detail = await submitRes.text().catch(() => "");
      throw new Error(`Suno submit failed (${submitRes.status}): ${detail.substring(0, 500)}`);
    }

    const submitData = (await submitRes.json()) as {
      code: number;
      data?: { taskId: string };
    };

    if (!submitData.data?.taskId) {
      throw new Error("Suno returned no taskId");
    }

    const jobId = submitData.data.taskId;
    logger.info("Suno", `Job submitted: ${jobId}`);

    const startTime = Date.now();
    while (Date.now() - startTime < SUNO_MAX_POLL_TIME_MS) {
      await sleep(SUNO_POLL_INTERVAL_MS);

      const statusRes = await fetch(`${baseUrl}/api/v1/task/${jobId}`, {
        headers: { Authorization: `Bearer ${ENV.sunoApiKey}` },
      });
      if (!statusRes.ok) continue;

      const statusData = (await statusRes.json()) as {
        data?: {
          response?: Array<{ audio_url?: string; title?: string; duration?: number }>;
          status?: string;
        };
      };

      const songs = statusData.data?.response;
      if (songs?.[0]?.audio_url) {
        logger.info("Suno", `Music ready: ${songs[0].title || jobId}`);
        return {
          audioUrl: songs[0].audio_url,
          title: songs[0].title || "BGM",
          duration: songs[0].duration || input.durationSec || 60,
        };
      }

      if (statusData.data?.status === "error") {
        throw new Error(`Suno failed: ${jobId}`);
      }
    }

    throw new Error(`Suno timed out: ${jobId}`);
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      throw new Error(`Suno timed out after ${SUNO_TIMEOUT_MS}ms`);
    }
    throw err;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
