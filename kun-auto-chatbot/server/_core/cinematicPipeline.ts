/**
 * Full cinematic video production pipeline.
 *
 * Orchestrates the entire flow from vehicle data to a finished
 * YouTube-ready video with story, characters, voiceover, and BGM.
 *
 * Pipeline:
 *   1. Claude → Storyboard (multi-scene script)
 *   2. Higgsfield Flux → Scene images (AI characters + settings)
 *   3. Higgsfield DoP → Scene videos (image → motion)
 *   4. ElevenLabs → Voiceover narration per scene
 *   5. Suno AI → Background music
 *   6. Remotion → Final composited video (stitch all together)
 *   7. (Optional) YouTube → Upload
 */
import { generateStoryboard, type Storyboard } from "./storyboard";
import { generateAllSceneImages } from "./sceneImageGen";
import { generateVideo, type VideoModel } from "./higgsfield";
import { generateSceneNarrations } from "./elevenlabs";
import { generateMusic } from "./sunoMusic";
import { uploadToYouTube, type YouTubeUploadResult } from "./youtubeUpload";
import { logger } from "../logger";
import type { VehicleInfo } from "./claude";
import fs from "fs";
import path from "path";

export type CinematicPipelineOptions = {
  vehicle: VehicleInfo;
  /** Primary vehicle photo URL (used in some scenes) */
  vehicleImageUrl: string;
  /** Upload to YouTube when done? */
  uploadToYouTube?: boolean;
  /** YouTube privacy setting */
  privacyStatus?: "public" | "unlisted" | "private";
  /** Video generation model (default: auto-selects cheapest available) */
  videoModel?: VideoModel;
};

export type SceneAssets = {
  sceneNumber: number;
  imageUrl: string;
  videoUrl: string;
  narrationPath: string;
  durationSec: number;
  description: string;
};

export type CinematicPipelineResult = {
  storyboard: Storyboard;
  scenes: SceneAssets[];
  musicUrl: string;
  /** Path to locally rendered final video (if Remotion rendered) */
  localVideoPath?: string;
  youtubeResult?: YouTubeUploadResult;
};

const OUTPUT_DIR = path.resolve("./output/cinematic");

/**
 * Run the full cinematic video production pipeline.
 */
export async function runCinematicPipeline(
  options: CinematicPipelineOptions
): Promise<CinematicPipelineResult> {
  const { vehicle, vehicleImageUrl } = options;
  const label = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const jobId = `${Date.now()}-${vehicle.make}-${vehicle.model}`.replace(/\s+/g, "-");
  const jobDir = path.join(OUTPUT_DIR, jobId);

  fs.mkdirSync(jobDir, { recursive: true });
  fs.mkdirSync(path.join(jobDir, "audio"), { recursive: true });

  // ── Step 1: Generate Storyboard ──
  logger.info("CinematicPipeline", `[1/6] Generating storyboard for ${label}...`);
  const storyboard = await generateStoryboard(vehicle);
  fs.writeFileSync(
    path.join(jobDir, "storyboard.json"),
    JSON.stringify(storyboard, null, 2)
  );

  // ── Step 2: Generate Scene Images ──
  logger.info("CinematicPipeline", `[2/6] Generating ${storyboard.scenes.length} scene images...`);
  const sceneImages = await generateAllSceneImages(
    storyboard.scenes.map((s) => ({
      prompt: s.imagePrompt,
      aspectRatio: "16:9" as const,
    }))
  );

  // ── Step 3: Generate Scene Videos (image → motion) ──
  logger.info("CinematicPipeline", `[3/6] Generating ${storyboard.scenes.length} scene videos...`);
  const sceneVideos: Array<{ requestId: string; videoUrl: string }> = [];

  for (let i = 0; i < storyboard.scenes.length; i++) {
    const scene = storyboard.scenes[i];
    logger.info("CinematicPipeline", `  Video ${i + 1}/${storyboard.scenes.length}: ${scene.description}`);
    const video = await generateVideo({
      prompt: scene.motionPrompt,
      imageUrl: sceneImages[i].imageUrl,
      model: options.videoModel,
      durationSec: scene.durationSec,
    });
    sceneVideos.push(video);
  }

  // ── Step 4: Generate Voiceover ──
  logger.info("CinematicPipeline", `[4/6] Generating voiceover narration...`);
  const narrations = storyboard.scenes.map((s) => s.narration);
  let narrationBuffers: Buffer[];

  try {
    narrationBuffers = await generateSceneNarrations(narrations);
  } catch (err) {
    logger.warn("CinematicPipeline", `Voiceover generation failed, continuing without: ${err}`);
    narrationBuffers = storyboard.scenes.map(() => Buffer.alloc(0));
  }

  // Save narration audio files
  const narrationPaths: string[] = [];
  for (let i = 0; i < narrationBuffers.length; i++) {
    const audioPath = path.join(jobDir, "audio", `narration-${i + 1}.mp3`);
    if (narrationBuffers[i].length > 0) {
      fs.writeFileSync(audioPath, narrationBuffers[i]);
    }
    narrationPaths.push(audioPath);
  }

  // ── Step 5: Generate BGM ──
  logger.info("CinematicPipeline", `[5/6] Generating background music...`);
  const totalDuration = storyboard.scenes.reduce((sum, s) => sum + s.durationSec, 0);
  let musicResult;

  try {
    musicResult = await generateMusic({
      prompt: storyboard.musicPrompt,
      durationSec: totalDuration,
      instrumental: true,
    });
  } catch (err) {
    logger.warn("CinematicPipeline", `BGM generation failed, continuing without: ${err}`);
    musicResult = { audioUrl: "", title: "No BGM", duration: 0 };
  }

  // ── Step 6: Assemble scene assets ──
  logger.info("CinematicPipeline", `[6/6] Assembling final assets...`);
  const scenes: SceneAssets[] = storyboard.scenes.map((scene, i) => ({
    sceneNumber: scene.sceneNumber,
    imageUrl: sceneImages[i].imageUrl,
    videoUrl: sceneVideos[i].videoUrl,
    narrationPath: narrationPaths[i],
    durationSec: scene.durationSec,
    description: scene.description,
  }));

  // Save manifest for Remotion rendering
  const manifest = {
    jobId,
    vehicle: { label, ...vehicle },
    storyboard,
    scenes: scenes.map((s, i) => ({
      ...s,
      imageUrl: sceneImages[i].imageUrl,
      videoUrl: sceneVideos[i].videoUrl,
    })),
    musicUrl: musicResult.audioUrl,
    youtube: storyboard.youtube,
  };

  fs.writeFileSync(
    path.join(jobDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  logger.info("CinematicPipeline", `Pipeline complete! Assets saved to ${jobDir}`);
  logger.info("CinematicPipeline", `  Scenes: ${scenes.length}`);
  logger.info("CinematicPipeline", `  Total duration: ~${totalDuration}s`);
  logger.info("CinematicPipeline", `  BGM: ${musicResult.title}`);

  // ── Optional: Upload to YouTube ──
  let youtubeResult: YouTubeUploadResult | undefined;

  if (options.uploadToYouTube && sceneVideos[0]?.videoUrl) {
    logger.info("CinematicPipeline", `Uploading to YouTube...`);
    // For now, upload the first scene video as a teaser
    // Full Remotion-rendered video would be uploaded after local render
    try {
      youtubeResult = await uploadToYouTube({
        title: storyboard.youtube.title,
        description: storyboard.youtube.description,
        tags: storyboard.youtube.tags,
        videoUrl: sceneVideos[0].videoUrl,
        privacyStatus: options.privacyStatus ?? "private",
      });
    } catch (err) {
      logger.warn("CinematicPipeline", `YouTube upload failed: ${err}`);
    }
  }

  return {
    storyboard,
    scenes,
    musicUrl: musicResult.audioUrl,
    localVideoPath: jobDir,
    youtubeResult,
  };
}
