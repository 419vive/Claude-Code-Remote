/**
 * Higgsfield AI video generation service.
 *
 * Uses the @higgsfield/client v2 SDK to generate cinematic
 * image-to-video content using the DoP (Director of Photography) model.
 */
import { ENV } from "./env";
import { logger } from "../logger";

const HIGGSFIELD_BASE_URL = "https://platform.higgsfield.ai";
const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_TIME_MS = 300_000; // 5 minutes

export type VideoGenerationInput = {
  prompt: string;
  imageUrl: string;
};

export type VideoGenerationResult = {
  requestId: string;
  videoUrl: string;
  status: "completed" | "failed" | "nsfw";
};

/**
 * Submit an image-to-video job to Higgsfield AI (DoP Turbo model).
 * Polls until the video is ready, then returns the video URL.
 */
export async function generateVideo(
  input: VideoGenerationInput
): Promise<VideoGenerationResult> {
  if (!ENV.higgsFieldCredentials) {
    throw new Error("HIGGSFIELD_CREDENTIALS is not configured (KEY_ID:KEY_SECRET)");
  }

  const authHeader = `Key ${ENV.higgsFieldCredentials}`;

  // 1. Submit the job
  logger.info("Higgsfield", `Submitting image-to-video job: ${input.prompt.substring(0, 80)}...`);

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
        {
          type: "image_url",
          image_url: input.imageUrl,
        },
      ],
    }),
  });

  if (!submitRes.ok) {
    const detail = await submitRes.text().catch(() => "");
    throw new Error(
      `Higgsfield submit failed (${submitRes.status}): ${detail.substring(0, 500)}`
    );
  }

  const submitData = (await submitRes.json()) as {
    request_id: string;
    status_url: string;
  };

  const requestId = submitData.request_id;
  logger.info("Higgsfield", `Job submitted: ${requestId}`);

  // 2. Poll for completion
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

    if (!statusRes.ok) {
      logger.warn("Higgsfield", `Status poll failed (${statusRes.status}), retrying...`);
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
      };
    }

    if (statusData.status === "failed" || statusData.status === "nsfw") {
      throw new Error(`Higgsfield job ${statusData.status}: ${requestId}`);
    }

    // Still queued or in_progress — keep polling
    logger.info("Higgsfield", `Job ${requestId}: ${statusData.status}`);
  }

  throw new Error(`Higgsfield job timed out after ${MAX_POLL_TIME_MS / 1000}s: ${requestId}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
