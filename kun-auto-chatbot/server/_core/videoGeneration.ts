/**
 * Video generation orchestration pipeline.
 *
 * Flow:
 *   1. Claude generates a cinematic prompt + YouTube metadata from vehicle info
 *   2. Higgsfield AI generates a cinematic video from prompt + vehicle image
 *   3. (Optional) Upload to YouTube
 *
 * Each step can be used independently or as part of the full pipeline.
 */
import { generateVideoPrompt, type VehicleInfo } from "./claude";
import { generateVideo } from "./higgsfield";
import { uploadToYouTube, type YouTubeUploadResult } from "./youtubeUpload";
import { logger } from "../logger";

export type VideoGenerationOptions = {
  vehicle: VehicleInfo;
  /** Primary image URL to use for video generation */
  imageUrl: string;
  /** Whether to upload the result to YouTube (default: false) */
  uploadToYouTube?: boolean;
  /** YouTube privacy status (default: "private") */
  privacyStatus?: "public" | "unlisted" | "private";
};

export type VideoGenerationPipelineResult = {
  promptResult: {
    cinematicPrompt: string;
    title: string;
    description: string;
    tags: string[];
  };
  videoResult: {
    requestId: string;
    videoUrl: string;
  };
  youtubeResult?: YouTubeUploadResult;
};

/**
 * Run the full video generation pipeline:
 *   Claude → Higgsfield → (optional) YouTube upload
 */
export async function runVideoGenerationPipeline(
  options: VideoGenerationOptions
): Promise<VideoGenerationPipelineResult> {
  const { vehicle, imageUrl } = options;
  const label = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  // Step 1: Claude generates cinematic prompt
  logger.info("VideoPipeline", `[1/3] Generating cinematic prompt for ${label}...`);
  const promptResult = await generateVideoPrompt(vehicle);
  logger.info("VideoPipeline", `Prompt: ${promptResult.cinematicPrompt.substring(0, 100)}...`);

  // Step 2: Higgsfield generates video
  logger.info("VideoPipeline", `[2/3] Generating cinematic video for ${label}...`);
  const videoResult = await generateVideo({
    prompt: promptResult.cinematicPrompt,
    imageUrl,
  });

  // Step 3: Optional YouTube upload
  let youtubeResult: YouTubeUploadResult | undefined;

  if (options.uploadToYouTube) {
    logger.info("VideoPipeline", `[3/3] Uploading to YouTube...`);
    youtubeResult = await uploadToYouTube({
      title: promptResult.title,
      description: promptResult.description,
      tags: promptResult.tags,
      videoUrl: videoResult.videoUrl,
      privacyStatus: options.privacyStatus ?? "private",
    });
    logger.info("VideoPipeline", `YouTube: ${youtubeResult.youtubeUrl}`);
  } else {
    logger.info("VideoPipeline", `[3/3] Skipping YouTube upload (not requested)`);
  }

  logger.info("VideoPipeline", `Pipeline complete for ${label}`);

  return {
    promptResult,
    videoResult: {
      requestId: videoResult.requestId,
      videoUrl: videoResult.videoUrl,
    },
    youtubeResult,
  };
}
