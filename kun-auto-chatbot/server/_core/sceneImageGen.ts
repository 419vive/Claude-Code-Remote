/**
 * AI scene image generation for storyboard scenes.
 *
 * Primary: Black Forest Labs (BFL) FLUX.2 Pro API — direct, official, best quality.
 * Fallback: Higgsfield Flux endpoint (if BFL key not configured).
 *
 * IMPORTANT: BFL signed URLs expire in 10 minutes. The pipeline must
 * download/use images promptly after generation.
 */
import { ENV } from "./env";
import { logger } from "../logger";

// ── BFL (Black Forest Labs) direct API ──
const BFL_BASE_URL = "https://api.bfl.ai";
const BFL_POLL_INTERVAL_MS = 2_000;
const BFL_MAX_POLL_TIME_MS = 120_000;

// ── Higgsfield fallback ──
const HIGGSFIELD_BASE_URL = "https://platform.higgsfield.ai";
const HF_POLL_INTERVAL_MS = 3_000;
const HF_MAX_POLL_TIME_MS = 120_000;

export type SceneImageInput = {
  prompt: string;
  /** Image dimensions. 16:9 → 1920×1080 for YouTube */
  aspectRatio?: "16:9" | "9:16" | "1:1";
  /** Width override (BFL accepts arbitrary sizes) */
  width?: number;
  /** Height override */
  height?: number;
};

export type SceneImageResult = {
  imageUrl: string;
  requestId: string;
};

// Aspect ratio → pixel dimensions for BFL
const ASPECT_TO_DIMS: Record<string, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1024, height: 1024 },
};

/**
 * Generate a single scene image.
 * Uses BFL FLUX.2 Pro if BFL_API_KEY is set, otherwise falls back to Higgsfield.
 */
export async function generateSceneImage(
  input: SceneImageInput
): Promise<SceneImageResult> {
  if (ENV.bflApiKey) {
    return generateViaBFL(input);
  }
  if (ENV.higgsFieldCredentials) {
    return generateViaHiggsfield(input);
  }
  throw new Error("Neither BFL_API_KEY nor HIGGSFIELD_CREDENTIALS is configured for image generation");
}

// ─────────────────────────────────────────────────────────
// BFL FLUX.2 Pro — Primary
// ─────────────────────────────────────────────────────────
async function generateViaBFL(input: SceneImageInput): Promise<SceneImageResult> {
  const dims = input.width && input.height
    ? { width: input.width, height: input.height }
    : ASPECT_TO_DIMS[input.aspectRatio || "16:9"];

  logger.info("SceneImageGen", `[BFL] Generating: "${input.prompt.substring(0, 80)}..."`);

  // Step 1: Submit
  const submitRes = await fetch(`${BFL_BASE_URL}/v1/flux-2-pro-preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-key": ENV.bflApiKey,
    },
    body: JSON.stringify({
      prompt: input.prompt,
      width: dims.width,
      height: dims.height,
      prompt_upsampling: true,
      safety_tolerance: 2,
      output_format: "jpeg",
      guidance: 3.5,
      steps: 40,
    }),
  });

  if (!submitRes.ok) {
    const detail = await submitRes.text().catch(() => "");
    throw new Error(`BFL submit failed (${submitRes.status}): ${detail.substring(0, 500)}`);
  }

  const submitData = (await submitRes.json()) as {
    id: string;
    polling_url?: string;
  };

  const requestId = submitData.id;
  logger.info("SceneImageGen", `[BFL] Job submitted: ${requestId}`);

  // Step 2: Poll for result
  const startTime = Date.now();

  while (Date.now() - startTime < BFL_MAX_POLL_TIME_MS) {
    await sleep(BFL_POLL_INTERVAL_MS);

    const pollRes = await fetch(
      `${BFL_BASE_URL}/v1/get_result?id=${requestId}`,
      { headers: { "x-key": ENV.bflApiKey } }
    );

    if (!pollRes.ok) continue;

    const pollData = (await pollRes.json()) as {
      id: string;
      status: string;
      result?: { sample: string; prompt?: string };
    };

    if (pollData.status === "Ready" && pollData.result?.sample) {
      logger.info("SceneImageGen", `[BFL] Image ready: ${requestId}`);
      // NOTE: BFL URLs expire in 10 minutes — use promptly!
      return {
        imageUrl: pollData.result.sample,
        requestId,
      };
    }

    if (pollData.status === "Error") {
      throw new Error(`BFL image generation failed: ${requestId}`);
    }

    // "Pending" or "Processing" — keep polling
  }

  throw new Error(`BFL image generation timed out: ${requestId}`);
}

// ─────────────────────────────────────────────────────────
// Higgsfield Flux — Fallback
// ─────────────────────────────────────────────────────────
async function generateViaHiggsfield(input: SceneImageInput): Promise<SceneImageResult> {
  const authHeader = `Key ${ENV.higgsFieldCredentials}`;

  logger.info("SceneImageGen", `[Higgsfield] Generating: "${input.prompt.substring(0, 80)}..."`);

  const submitRes = await fetch(
    `${HIGGSFIELD_BASE_URL}/v1/flux-pro/kontext/max/text-to-image`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        "User-Agent": "kunjia-autos-video/1.0",
      },
      body: JSON.stringify({
        prompt: input.prompt,
        aspect_ratio: input.aspectRatio || "16:9",
        safety_tolerance: 2,
      }),
    }
  );

  if (!submitRes.ok) {
    const detail = await submitRes.text().catch(() => "");
    throw new Error(`Higgsfield Flux submit failed (${submitRes.status}): ${detail.substring(0, 500)}`);
  }

  const submitData = (await submitRes.json()) as {
    request_id: string;
    status?: string;
    images?: Array<{ url: string }>;
  };

  if (submitData.images?.[0]?.url) {
    return { imageUrl: submitData.images[0].url, requestId: submitData.request_id };
  }

  const requestId = submitData.request_id;
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

    if (!statusRes.ok) continue;

    const statusData = (await statusRes.json()) as {
      status: string;
      images?: Array<{ url: string }>;
    };

    if (statusData.status === "completed" && statusData.images?.[0]?.url) {
      logger.info("SceneImageGen", `[Higgsfield] Image ready: ${requestId}`);
      return { imageUrl: statusData.images[0].url, requestId };
    }

    if (statusData.status === "failed" || statusData.status === "nsfw") {
      throw new Error(`Higgsfield image generation ${statusData.status}: ${requestId}`);
    }
  }

  throw new Error(`Higgsfield image generation timed out: ${requestId}`);
}

/**
 * Generate images for all storyboard scenes.
 * Processes sequentially to respect rate limits (BFL max 24 concurrent).
 */
export async function generateAllSceneImages(
  scenes: SceneImageInput[]
): Promise<SceneImageResult[]> {
  const results: SceneImageResult[] = [];

  for (let i = 0; i < scenes.length; i++) {
    logger.info("SceneImageGen", `Scene ${i + 1}/${scenes.length}`);
    const result = await generateSceneImage(scenes[i]);
    results.push(result);
  }

  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
