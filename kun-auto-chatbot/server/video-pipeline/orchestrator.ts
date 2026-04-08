import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { assembleFinalVideo } from "./assembler";
import { generateMusic, generateSubtitles, ttsElevenLabs, ttsFishSpeech } from "./audio";
import { ProviderRegistry } from "./providers";
import type { GeneratedClip, Resolution, Script, Shot, VideoProject } from "./types";

/**
 * Main pipeline orchestrator.
 *
 *   Script → per-shot provider dispatch (parallel) → clips
 *   Script → dialogue TTS → voiceover
 *   Script → music prompt → BGM
 *   voiceover → WhisperX → subtitles
 *   clips + voiceover + BGM + subtitles → final MP4 (via Remotion/FFmpeg assembly hook)
 *
 * Concurrency: up to 4 parallel provider calls (respects Luma 10 concurrent limit).
 * Dry-run: skips all external calls, returns a plan with fake URLs — use this
 * to verify the shot list and budget before burning API credits.
 */

export interface OrchestrateOptions {
  script: Script;
  outputDir: string;
  resolution?: Resolution;
  dryRun?: boolean;
  concurrency?: number;
  registry?: ProviderRegistry;
}

export async function orchestrate(options: OrchestrateOptions): Promise<VideoProject> {
  const {
    script,
    outputDir,
    resolution = "1080p",
    dryRun = false,
    concurrency = 4,
    registry = new ProviderRegistry(),
  } = options;

  const projectId = randomUUID();
  const projectDir = path.join(outputDir, projectId);
  await fs.mkdir(projectDir, { recursive: true });

  console.log(`[orchestrator] ${script.title} — ${script.shots.length} shots (${dryRun ? "DRY RUN" : "LIVE"})`);

  // 1. Generate clips in parallel batches
  const clips = await generateClips({
    shots: script.shots,
    script,
    resolution,
    dryRun,
    concurrency,
    registry,
  });

  // 2. Voice-over for all dialogue (concatenate into one track for now)
  const fullDialogue = script.shots
    .flatMap((s) => s.dialogue.map((d) => d.line))
    .join("\n");
  const voiceoverPath = path.join(projectDir, "voiceover.mp3");
  let voiceoverCost = 0;
  if (fullDialogue.trim().length > 0 && !dryRun) {
    try {
      const vo = process.env.ELEVENLABS_API_KEY
        ? await ttsElevenLabs({
            text: fullDialogue,
            language: script.language,
            outputPath: voiceoverPath,
          })
        : await ttsFishSpeech({
            text: fullDialogue,
            language: script.language,
            outputPath: voiceoverPath,
          });
      voiceoverCost = vo.costUsd;
    } catch (err) {
      console.warn("[orchestrator] voice-over failed:", (err as Error).message);
    }
  }

  // 3. Music (always generated — music is mandatory, never optional)
  const musicPath = path.join(projectDir, "music.mp3");
  let musicCost = 0;
  if (!dryRun) {
    try {
      const music = await generateMusic({
        prompt: script.musicPrompt,
        durationSec: script.targetDurationSec,
        outputPath: musicPath,
      });
      musicCost = music.costUsd;
    } catch (err) {
      console.warn("[orchestrator] music failed:", (err as Error).message);
    }
  }

  // 4. Subtitles from the voiceover
  const subtitlePath = path.join(projectDir, "subtitles.vtt");
  if (!dryRun && fullDialogue.trim().length > 0) {
    try {
      await generateSubtitles({
        audioPath: voiceoverPath,
        language: script.language.split(",")[0],
        outputVttPath: subtitlePath,
      });
    } catch (err) {
      console.warn("[orchestrator] subtitles failed:", (err as Error).message);
    }
  }

  // 5. Final assembly — real FFmpeg stitch (requires ffmpeg on PATH)
  const finalPath = path.join(projectDir, "final.mp4");
  if (!dryRun) {
    try {
      await assembleFinalVideo({
        clips,
        voiceoverPath: (await fileExists(voiceoverPath)) ? voiceoverPath : undefined,
        musicPath: (await fileExists(musicPath)) ? musicPath : undefined,
        subtitlePath: (await fileExists(subtitlePath)) ? subtitlePath : undefined,
        outputPath: finalPath,
      });
    } catch (err) {
      console.warn("[orchestrator] assembly failed:", (err as Error).message);
      // Write a manifest so the user can stitch manually
      await fs.writeFile(
        finalPath.replace(/\.mp4$/, ".manifest.json"),
        JSON.stringify(
          {
            clips: clips.map((c) => c.videoUrl),
            voiceover: voiceoverPath,
            music: musicPath,
            subtitles: subtitlePath,
            error: (err as Error).message,
          },
          null,
          2,
        ),
      );
    }
  }

  const totalCost = clips.reduce((sum, c) => sum + c.costUsd, 0) + voiceoverCost + musicCost;
  console.log(`[orchestrator] ${script.title} done — estimated cost $${totalCost.toFixed(3)}`);

  return {
    id: projectId,
    script,
    clips,
    voiceoverUrl: `file://${voiceoverPath}`,
    musicUrl: `file://${musicPath}`,
    subtitleVttUrl: `file://${subtitlePath}`,
    finalVideoUrl: `file://${finalPath}`,
    totalCostUsd: totalCost,
    createdAt: new Date(),
  };
}

/** Dispatch all shots to their providers with bounded concurrency */
async function generateClips(opts: {
  shots: Shot[];
  script: Script;
  resolution: Resolution;
  dryRun: boolean;
  concurrency: number;
  registry: ProviderRegistry;
}): Promise<GeneratedClip[]> {
  const { shots, script, resolution, dryRun, concurrency, registry } = opts;
  const results: GeneratedClip[] = new Array(shots.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < shots.length) {
      const i = cursor++;
      const shot = shots[i];
      const provider = registry.pickFor(shot);

      const characterRefs = shot.characters
        .map((cid) => script.characters.find((c) => c.id === cid))
        .flatMap((c) => {
          if (!c) return [];
          const locked = c.lockedIn[provider.name];
          return locked ? [locked] : c.referenceImages;
        });
      const productRefs = shot.productInsert ? [shot.productInsert.heroPhotoUrl] : [];

      try {
        const clip = await provider.generateClip({
          shot,
          characterRefs,
          productRefs,
          resolution,
          dryRun,
        });
        results[i] = {
          shotIndex: shot.index,
          videoUrl: clip.videoUrl,
          durationSec: clip.durationSec,
          provider: clip.provider,
          costUsd: clip.costUsd,
        };
        console.log(
          `[shot ${shot.index}/${shots.length}] ${provider.name} → ${clip.dryRun ? "DRY" : "$" + clip.costUsd.toFixed(3)}`,
        );
      } catch (err) {
        console.error(`[shot ${shot.index}] ${provider.name} failed:`, (err as Error).message);
        throw err;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
