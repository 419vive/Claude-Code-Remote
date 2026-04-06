/**
 * Suno AI background music generation service.
 *
 * Generates royalty-free background music from a text description.
 * Uses Suno's API to create custom BGM for vehicle ads.
 *
 * NOTE: Suno's official API availability varies. This module supports
 * both the official API and a self-hosted proxy pattern.
 * If Suno API is not available, falls back to a preset music URL.
 */
import { ENV } from "./env";
import { logger } from "../logger";

const SUNO_TIMEOUT_MS = 120_000; // Music generation can take a while
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_TIME_MS = 180_000; // 3 minutes

export type MusicGenerationInput = {
  /** Description of the music style/mood (English) */
  prompt: string;
  /** Duration in seconds (approximate) */
  durationSec?: number;
  /** Whether instrumental only (no vocals) */
  instrumental?: boolean;
};

export type MusicGenerationResult = {
  audioUrl: string;
  title: string;
  duration: number;
};

// Preset fallback BGM URLs (royalty-free, hosted)
const FALLBACK_BGM: Record<string, string> = {
  warm: "",      // Will be populated with actual URLs
  upbeat: "",
  cinematic: "",
  emotional: "",
};

/**
 * Generate background music using Suno AI.
 * Falls back to preset URLs if Suno API is not configured.
 */
export async function generateMusic(
  input: MusicGenerationInput
): Promise<MusicGenerationResult> {
  // If Suno API is configured, use it
  if (ENV.sunoApiKey) {
    return generateViaSunoApi(input);
  }

  // Fallback: return empty (Remotion will render without BGM)
  logger.warn("SunoMusic", "SUNO_API_KEY not configured — skipping BGM generation");
  return {
    audioUrl: "",
    title: "No BGM",
    duration: 0,
  };
}

async function generateViaSunoApi(
  input: MusicGenerationInput
): Promise<MusicGenerationResult> {
  const baseUrl = ENV.sunoBaseUrl;

  logger.info("SunoMusic", `Generating music: "${input.prompt.substring(0, 60)}..."`);

  // Submit generation request
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUNO_TIMEOUT_MS);

  try {
    // sunoapi.org third-party wrapper format
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
        prompt: "", // empty for instrumental
        negativeTags: "vocals, singing, lyrics",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!submitRes.ok) {
      const detail = await submitRes.text().catch(() => "");
      throw new Error(`Suno API submit failed (${submitRes.status}): ${detail.substring(0, 500)}`);
    }

    const submitData = (await submitRes.json()) as {
      code: number;
      data?: {
        taskId: string;
        status?: string;
      };
    };

    if (!submitData.data?.taskId) {
      throw new Error("Suno API returned no taskId");
    }

    const jobId = submitData.data.taskId;
    logger.info("SunoMusic", `Job submitted: ${jobId}`);

    // Poll for completion
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_POLL_TIME_MS) {
      await sleep(POLL_INTERVAL_MS);

      const statusRes = await fetch(`${baseUrl}/api/v1/task/${jobId}`, {
        headers: { Authorization: `Bearer ${ENV.sunoApiKey}` },
      });

      if (!statusRes.ok) continue;

      const statusData = (await statusRes.json()) as {
        code: number;
        data?: {
          response?: Array<{
            id: string;
            audio_url?: string;
            title?: string;
            duration?: number;
            tags?: string;
          }>;
          status?: string;
        };
      };

      const songs = statusData.data?.response;
      if (songs?.[0]?.audio_url) {
        const song = songs[0];
        logger.info("SunoMusic", `Music ready: ${song.title || jobId}`);
        return {
          audioUrl: song.audio_url,
          title: song.title || "BGM",
          duration: song.duration || input.durationSec || 60,
        };
      }

      if (statusData.data?.status === "error") {
        throw new Error(`Suno music generation failed: ${jobId}`);
      }
    }

    throw new Error(`Suno music generation timed out: ${jobId}`);
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      throw new Error(`Suno request timed out after ${SUNO_TIMEOUT_MS}ms`);
    }
    throw err;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
