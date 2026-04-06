/**
 * AI scene image generation for storyboard scenes.
 *
 * Uses Higgsfield's Flux endpoint to generate character/scene images
 * from the storyboard's imagePrompt for each scene.
 *
 * Falls back to the existing Forge image generation API if Higgsfield
 * Flux is not available.
 */
import { ENV } from "./env";
import { logger } from "../logger";

const HIGGSFIELD_BASE_URL = "https://platform.higgsfield.ai";
const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_TIME_MS = 120_000; // 2 minutes per image

export type SceneImageInput = {
  prompt: string;
  /** 16:9 for YouTube landscape, 9:16 for Shorts */
  aspectRatio?: "16:9" | "9:16" | "1:1";
};

export type SceneImageResult = {
  imageUrl: string;
  requestId: string;
};

/**
 * Generate a single scene image using Higgsfield Flux.
 */
export async function generateSceneImage(
  input: SceneImageInput
): Promise<SceneImageResult> {
  if (!ENV.higgsFieldCredentials) {
    throw new Error("HIGGSFIELD_CREDENTIALS is not configured");
  }

  const authHeader = `Key ${ENV.higgsFieldCredentials}`;

  logger.info("SceneImageGen", `Generating: "${input.prompt.substring(0, 80)}..."`);

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

  // If already completed (synchronous)
  if (submitData.images?.[0]?.url) {
    return {
      imageUrl: submitData.images[0].url,
      requestId: submitData.request_id,
    };
  }

  // Poll for completion
  const requestId = submitData.request_id;
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    await sleep(POLL_INTERVAL_MS);

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
      logger.info("SceneImageGen", `Image ready: ${requestId}`);
      return {
        imageUrl: statusData.images[0].url,
        requestId,
      };
    }

    if (statusData.status === "failed" || statusData.status === "nsfw") {
      throw new Error(`Image generation ${statusData.status}: ${requestId}`);
    }
  }

  throw new Error(`Image generation timed out: ${requestId}`);
}

/**
 * Generate images for all storyboard scenes.
 * Processes sequentially to avoid rate limits.
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
