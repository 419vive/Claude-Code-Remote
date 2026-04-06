/**
 * Video generation service.
 *
 * Supports two backends:
 *   1. Seedance 2.0 (ByteDance) — via third-party API, cheaper ($0.02/sec), native audio
 *   2. Higgsfield DoP Turbo — cinematic camera controls ($0.08/sec)
 *
 * Default: Seedance 2.0 Fast (if SEEDANCE_API_KEY configured), else DoP Turbo.
 */
import { ENV } from "./env";
import { logger } from "../logger";

// ── Seedance 2.0 (third-party API) ──
const SEEDANCE_BASE_URL = "https://api.evolink.ai";
const SEEDANCE_POLL_INTERVAL_MS = 5_000;
const SEEDANCE_MAX_POLL_TIME_MS = 300_000; // 5 minutes

// ── Higgsfield DoP ──
const HIGGSFIELD_BASE_URL = "https://platform.higgsfield.ai";
const HF_POLL_INTERVAL_MS = 3_000;
const HF_MAX_POLL_TIME_MS = 300_000;

export type VideoModel = "seedance-2.0-fast" | "seedance-2.0-pro" | "dop-turbo";

export type VideoGenerationInput = {
  prompt: string;
  imageUrl: string;
  /** Which model to use (default: auto-selects based on available keys) */
  model?: VideoModel;
  /** Video duration in seconds (Seedance: 4-15, DoP: 5-10) */
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
  return generateViaHiggsfield(input);
}

function selectDefaultModel(): VideoModel {
  if (ENV.seedanceApiKey) return "seedance-2.0-fast";
  if (ENV.higgsFieldCredentials) return "dop-turbo";
  throw new Error("No video generation API configured (SEEDANCE_API_KEY or HIGGSFIELD_CREDENTIALS)");
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

  // 1. Submit
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

  const submitData = (await submitRes.json()) as {
    id: string;
    status: string;
  };

  const taskId = submitData.id;
  logger.info("Seedance", `Job submitted: ${taskId}`);

  // 2. Poll for completion
  const startTime = Date.now();

  while (Date.now() - startTime < SEEDANCE_MAX_POLL_TIME_MS) {
    await sleep(SEEDANCE_POLL_INTERVAL_MS);

    const statusRes = await fetch(`${SEEDANCE_BASE_URL}/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${ENV.seedanceApiKey}` },
    });

    if (!statusRes.ok) {
      logger.warn("Seedance", `Poll failed (${statusRes.status}), retrying...`);
      continue;
    }

    const statusData = (await statusRes.json()) as {
      id: string;
      status: string;
      progress?: number;
      output?: { video_url?: string };
      error?: { message?: string };
    };

    if (statusData.status === "completed" && statusData.output?.video_url) {
      logger.info("Seedance", `Video ready: ${taskId}`);
      return {
        requestId: taskId,
        videoUrl: statusData.output.video_url,
        status: "completed",
        model,
      };
    }

    if (statusData.status === "failed") {
      const errMsg = statusData.error?.message || "unknown error";
      throw new Error(`Seedance job failed (${taskId}): ${errMsg}`);
    }

    // Still pending/processing
    const pct = statusData.progress != null ? ` ${statusData.progress}%` : "";
    logger.info("Seedance", `Job ${taskId}: ${statusData.status}${pct}`);
  }

  throw new Error(`Seedance job timed out after ${SEEDANCE_MAX_POLL_TIME_MS / 1000}s: ${taskId}`);
}

// ─────────────────────────────────────────────────────────
// Higgsfield DoP Turbo (original)
// ─────────────────────────────────────────────────────────
async function generateViaHiggsfield(
  input: VideoGenerationInput
): Promise<VideoGenerationResult> {
  if (!ENV.higgsFieldCredentials) {
    throw new Error("HIGGSFIELD_CREDENTIALS is not configured (KEY_ID:KEY_SECRET)");
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
      input_images: [
        { type: "image_url", image_url: input.imageUrl },
      ],
    }),
  });

  if (!submitRes.ok) {
    const detail = await submitRes.text().catch(() => "");
    throw new Error(`Higgsfield submit failed (${submitRes.status}): ${detail.substring(0, 500)}`);
  }

  const submitData = (await submitRes.json()) as {
    request_id: string;
    status_url: string;
  };

  const requestId = submitData.request_id;
  logger.info("Higgsfield", `Job submitted: ${requestId}`);

  const startTime = Date.now();

  while (Date.now() - startTime < HF_MAX_POLL_TIME_MS) {
    await sleep(HF_POLL_INTERVAL_MS);

    const statusRes = await fetch(
      `${HIGGSFIELD_BASE_URL}/requests/${requestId}/status`,
      {
        headers: {
          Authorization: authHeader,
          "User-Agent": "kunjia-autos-video/1.0",
        },
      }
    );

    if (!statusRes.ok) {
      logger.warn("Higgsfield", `Poll failed (${statusRes.status}), retrying...`);
      continue;
    }

    const statusData = (await statusRes.json()) as {
      status: string;
      video?: { url: string };
    };

    if (statusData.status === "completed" && statusData.video?.url) {
      logger.info("Higgsfield", `Video ready: ${requestId}`);
      return {
        requestId,
        videoUrl: statusData.video.url,
        status: "completed",
        model: "dop-turbo",
      };
    }

    if (statusData.status === "failed" || statusData.status === "nsfw") {
      throw new Error(`Higgsfield job ${statusData.status}: ${requestId}`);
    }

    logger.info("Higgsfield", `Job ${requestId}: ${statusData.status}`);
  }

  throw new Error(`Higgsfield job timed out after ${HF_MAX_POLL_TIME_MS / 1000}s: ${requestId}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
