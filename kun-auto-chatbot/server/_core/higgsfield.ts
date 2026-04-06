/**
 * Video generation service — multi-backend.
 *
 * Supports three backends:
 *   1. Seedance 2.0 (ByteDance) — via third-party API, cheapest ($0.02/sec), native audio
 *   2. Luma AI Dream Machine — best motion quality ($0.08/sec), keyframe control
 *   3. Higgsfield DoP Turbo — cinematic camera controls ($0.08/sec)
 *
 * Priority: Seedance 2.0 Fast → Luma AI → DoP Turbo (based on configured keys).
 */
import { ENV } from "./env";
import { logger } from "../logger";

// ── Seedance 2.0 (third-party API) ──
const SEEDANCE_BASE_URL = "https://api.evolink.ai";
const SEEDANCE_POLL_INTERVAL_MS = 5_000;
const SEEDANCE_MAX_POLL_TIME_MS = 300_000;

// ── Luma AI Dream Machine ──
const LUMA_BASE_URL = "https://api.lumalabs.ai/dream-machine/v1";
const LUMA_POLL_INTERVAL_MS = 4_000;
const LUMA_MAX_POLL_TIME_MS = 300_000;

// ── Higgsfield DoP ──
const HIGGSFIELD_BASE_URL = "https://platform.higgsfield.ai";
const HF_POLL_INTERVAL_MS = 3_000;
const HF_MAX_POLL_TIME_MS = 300_000;

export type VideoModel =
  | "seedance-2.0-fast"
  | "seedance-2.0-pro"
  | "luma-dream-machine"
  | "dop-turbo";

export type VideoGenerationInput = {
  prompt: string;
  imageUrl: string;
  /** Which model to use (default: auto-selects based on available keys) */
  model?: VideoModel;
  /** Video duration in seconds (Seedance: 4-15, DoP: 5-10, Luma: ~5) */
  durationSec?: number;
  /** Generate synchronized audio (Seedance 2.0 only) */
  generateAudio?: boolean;
};

export type VideoGenerationResult = {
  requestId: string;
  videoUrl: string;
  status: "completed" | "failed" | "nsfw";
  model: VideoModel;
};

/**
 * Generate a video from an image + prompt.
 * Auto-selects the best available model.
 */
export async function generateVideo(
  input: VideoGenerationInput
): Promise<VideoGenerationResult> {
  const model = input.model || selectDefaultModel();

  if (model.startsWith("seedance")) {
    return generateViaSeedance(input, model as "seedance-2.0-fast" | "seedance-2.0-pro");
  }
  if (model === "luma-dream-machine") {
    return generateViaLuma(input);
  }
  return generateViaHiggsfield(input);
}

function selectDefaultModel(): VideoModel {
  if (ENV.seedanceApiKey) return "seedance-2.0-fast";
  if (ENV.lumaApiKey) return "luma-dream-machine";
  if (ENV.higgsFieldCredentials) return "dop-turbo";
  throw new Error("No video generation API configured (SEEDANCE_API_KEY, LUMA_API_KEY, or HIGGSFIELD_CREDENTIALS)");
}

// ─────────────────────────────────────────────────────────
// Seedance 2.0 (via EvoLink third-party API)
// ─────────────────────────────────────────────────────────
async function generateViaSeedance(
  input: VideoGenerationInput,
  model: "seedance-2.0-fast" | "seedance-2.0-pro"
): Promise<VideoGenerationResult> {
  if (!ENV.seedanceApiKey) {
    throw new Error("SEEDANCE_API_KEY is not configured");
  }

  const apiModel = model === "seedance-2.0-fast"
    ? "seedance-2.0-fast-image-to-video"
    : "seedance-2.0-image-to-video";

  logger.info("Seedance", `[${model}] Submitting: ${input.prompt.substring(0, 80)}...`);

  const submitRes = await fetch(`${SEEDANCE_BASE_URL}/v1/videos/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.seedanceApiKey}`,
    },
    body: JSON.stringify({
      model: apiModel,
      prompt: input.prompt,
      image_urls: [input.imageUrl],
      duration: input.durationSec || 10,
      quality: "720p",
      aspect_ratio: "16:9",
      generate_audio: input.generateAudio ?? false,
    }),
  });

  if (!submitRes.ok) {
    const detail = await submitRes.text().catch(() => "");
    throw new Error(`Seedance submit failed (${submitRes.status}): ${detail.substring(0, 500)}`);
  }

  const submitData = (await submitRes.json()) as { id: string; status: string };
  const taskId = submitData.id;
  logger.info("Seedance", `Job submitted: ${taskId}`);

  const startTime = Date.now();
  while (Date.now() - startTime < SEEDANCE_MAX_POLL_TIME_MS) {
    await sleep(SEEDANCE_POLL_INTERVAL_MS);

    const statusRes = await fetch(`${SEEDANCE_BASE_URL}/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${ENV.seedanceApiKey}` },
    });
    if (!statusRes.ok) { continue; }

    const s = (await statusRes.json()) as {
      id: string; status: string; progress?: number;
      output?: { video_url?: string }; error?: { message?: string };
    };

    if (s.status === "completed" && s.output?.video_url) {
      logger.info("Seedance", `Video ready: ${taskId}`);
      return { requestId: taskId, videoUrl: s.output.video_url, status: "completed", model };
    }
    if (s.status === "failed") {
      throw new Error(`Seedance job failed (${taskId}): ${s.error?.message || "unknown"}`);
    }
    const pct = s.progress != null ? ` ${s.progress}%` : "";
    logger.info("Seedance", `Job ${taskId}: ${s.status}${pct}`);
  }

  throw new Error(`Seedance timed out: ${taskId}`);
}

// ─────────────────────────────────────────────────────────
// Luma AI Dream Machine
// ─────────────────────────────────────────────────────────
async function generateViaLuma(
  input: VideoGenerationInput
): Promise<VideoGenerationResult> {
  if (!ENV.lumaApiKey) {
    throw new Error("LUMA_API_KEY is not configured");
  }

  logger.info("LumaAI", `Submitting: ${input.prompt.substring(0, 80)}...`);

  // Submit generation (image-to-video via keyframes)
  const submitRes = await fetch(`${LUMA_BASE_URL}/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.lumaApiKey}`,
    },
    body: JSON.stringify({
      prompt: input.prompt,
      keyframes: {
        frame0: {
          type: "image",
          url: input.imageUrl,
        },
      },
      aspect_ratio: "16:9",
      loop: false,
    }),
  });

  if (!submitRes.ok) {
    const detail = await submitRes.text().catch(() => "");
    throw new Error(`Luma submit failed (${submitRes.status}): ${detail.substring(0, 500)}`);
  }

  const submitData = (await submitRes.json()) as {
    id: string;
    state: string;
  };

  const genId = submitData.id;
  logger.info("LumaAI", `Job submitted: ${genId}`);

  // Poll for completion (states: queued → dreaming → completed | failed)
  const startTime = Date.now();
  while (Date.now() - startTime < LUMA_MAX_POLL_TIME_MS) {
    await sleep(LUMA_POLL_INTERVAL_MS);

    const statusRes = await fetch(`${LUMA_BASE_URL}/generations/${genId}`, {
      headers: { Authorization: `Bearer ${ENV.lumaApiKey}` },
    });
    if (!statusRes.ok) { continue; }

    const s = (await statusRes.json()) as {
      id: string;
      state: string;
      failure_reason: string | null;
      assets: { video: string | null };
    };

    if (s.state === "completed" && s.assets.video) {
      logger.info("LumaAI", `Video ready: ${genId}`);
      return {
        requestId: genId,
        videoUrl: s.assets.video,
        status: "completed",
        model: "luma-dream-machine",
      };
    }

    if (s.state === "failed") {
      throw new Error(`Luma job failed (${genId}): ${s.failure_reason || "unknown"}`);
    }

    logger.info("LumaAI", `Job ${genId}: ${s.state}`);
  }

  throw new Error(`Luma timed out: ${genId}`);
}

// ─────────────────────────────────────────────────────────
// Higgsfield DoP Turbo
// ─────────────────────────────────────────────────────────
async function generateViaHiggsfield(
  input: VideoGenerationInput
): Promise<VideoGenerationResult> {
  if (!ENV.higgsFieldCredentials) {
    throw new Error("HIGGSFIELD_CREDENTIALS is not configured");
  }

  const authHeader = `Key ${ENV.higgsFieldCredentials}`;
  logger.info("Higgsfield", `[DoP Turbo] Submitting: ${input.prompt.substring(0, 80)}...`);

  const submitRes = await fetch(`${HIGGSFIELD_BASE_URL}/v1/image2video/dop`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
      "User-Agent": "kunjia-autos-video/1.0",
    },
    body: JSON.stringify({
      model: "dop-turbo",
      prompt: input.prompt,
      input_images: [{ type: "image_url", image_url: input.imageUrl }],
    }),
  });

  if (!submitRes.ok) {
    const detail = await submitRes.text().catch(() => "");
    throw new Error(`Higgsfield submit failed (${submitRes.status}): ${detail.substring(0, 500)}`);
  }

  const submitData = (await submitRes.json()) as { request_id: string };
  const requestId = submitData.request_id;
  logger.info("Higgsfield", `Job submitted: ${requestId}`);

  const startTime = Date.now();
  while (Date.now() - startTime < HF_MAX_POLL_TIME_MS) {
    await sleep(HF_POLL_INTERVAL_MS);

    const statusRes = await fetch(`${HIGGSFIELD_BASE_URL}/requests/${requestId}/status`, {
      headers: { Authorization: authHeader, "User-Agent": "kunjia-autos-video/1.0" },
    });
    if (!statusRes.ok) { continue; }

    const s = (await statusRes.json()) as { status: string; video?: { url: string } };

    if (s.status === "completed" && s.video?.url) {
      logger.info("Higgsfield", `Video ready: ${requestId}`);
      return { requestId, videoUrl: s.video.url, status: "completed", model: "dop-turbo" };
    }
    if (s.status === "failed" || s.status === "nsfw") {
      throw new Error(`Higgsfield job ${s.status}: ${requestId}`);
    }
    logger.info("Higgsfield", `Job ${requestId}: ${s.status}`);
  }

  throw new Error(`Higgsfield timed out: ${requestId}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
