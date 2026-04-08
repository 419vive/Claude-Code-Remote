import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import type { GeneratedClip } from "./types";

/**
 * Final MP4 assembler — FFmpeg-based stitcher.
 *
 * Pipeline:
 *   1. Download each provider clip to local disk
 *   2. Concat clips (re-encode to normalize frame rate / codec)
 *   3. Mix voice-over (full volume) + music (ducked to 15%)
 *   4. Burn in word-level subtitles from WhisperX VTT
 *   5. Output a single final.mp4
 *
 * Requires ffmpeg on PATH. Check with `ffmpeg -version`.
 */

export interface AssembleParams {
  clips: GeneratedClip[];
  voiceoverPath?: string; // may be missing if no dialogue
  musicPath?: string; // may be missing if music gen failed and no fallback
  subtitlePath?: string; // may be missing if WhisperX unavailable
  outputPath: string;
  /** Video resolution — must match what was generated */
  width?: number;
  height?: number;
}

export interface AssembleResult {
  outputPath: string;
  durationSec: number;
  sizeBytes: number;
}

export async function assembleFinalVideo(params: AssembleParams): Promise<AssembleResult> {
  const outputDir = path.dirname(params.outputPath);
  const workDir = path.join(outputDir, "assembly");
  await fs.mkdir(workDir, { recursive: true });

  console.log(`[assembler] assembling ${params.clips.length} clips → ${params.outputPath}`);

  // 1. Download all clips to local disk, in order
  const localClips: string[] = [];
  for (const clip of params.clips.sort((a, b) => a.shotIndex - b.shotIndex)) {
    const localPath = path.join(workDir, `clip-${String(clip.shotIndex).padStart(3, "0")}.mp4`);
    await downloadFile(clip.videoUrl, localPath);
    localClips.push(localPath);
  }

  // 2. Build ffmpeg concat demuxer list file
  const listPath = path.join(workDir, "concat.txt");
  const listContent = localClips.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
  await fs.writeFile(listPath, listContent);

  // 3. Concat + normalize (re-encode to ensure consistent codec/fps)
  const joinedPath = path.join(workDir, "joined.mp4");
  await runFfmpeg([
    "-f", "concat",
    "-safe", "0",
    "-i", listPath,
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "23",
    "-pix_fmt", "yuv420p",
    "-r", "30",
    "-an", // strip any audio from clips (providers sometimes ship silent tracks)
    "-y",
    joinedPath,
  ]);

  // 4. Build the final command: video + voice + music + subs in one pass
  const args: string[] = ["-i", joinedPath];

  const hasVoice = params.voiceoverPath && (await exists(params.voiceoverPath));
  const hasMusic = params.musicPath && (await exists(params.musicPath));
  const hasSubs = params.subtitlePath && (await exists(params.subtitlePath));

  if (hasVoice) args.push("-i", params.voiceoverPath!);
  if (hasMusic) args.push("-i", params.musicPath!);

  // Build audio filter chain
  let audioMap = "";
  if (hasVoice && hasMusic) {
    // Voice at 1.0, music ducked to 0.15, mixed together
    args.push(
      "-filter_complex",
      "[2:a]volume=0.15[bgm];[1:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]",
    );
    audioMap = "[aout]";
  } else if (hasVoice) {
    audioMap = "1:a";
  } else if (hasMusic) {
    // Music only, ducked slightly for overall listening comfort
    args.push("-filter_complex", "[1:a]volume=0.4[aout]");
    audioMap = "[aout]";
  }

  // Video filter: burn in subtitles if present
  if (hasSubs) {
    const vf = `subtitles='${params.subtitlePath!.replace(/'/g, "'\\''")}':force_style='FontName=Noto Sans TC,Fontsize=20,PrimaryColour=&Hffffff&,OutlineColour=&H000000&,Outline=2,Shadow=1'`;
    args.push("-vf", vf);
  }

  // Output mapping
  args.push("-map", "0:v");
  if (audioMap) args.push("-map", audioMap);
  args.push(
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "20",
    "-c:a", "aac",
    "-b:a", "192k",
    "-movflags", "+faststart",
    "-y",
    params.outputPath,
  );

  await runFfmpeg(args);

  // 5. Stat the output file
  const stat = await fs.stat(params.outputPath);
  const durationSec = await probeDuration(params.outputPath);

  // Clean up the work directory to save disk
  await fs.rm(workDir, { recursive: true, force: true });

  console.log(`[assembler] done: ${params.outputPath} (${(stat.size / 1_000_000).toFixed(1)} MB, ${durationSec}s)`);

  return {
    outputPath: params.outputPath,
    durationSec,
    sizeBytes: stat.size,
  };
}

/* ========================================================================
   Helpers
   ======================================================================== */

async function downloadFile(url: string, localPath: string): Promise<void> {
  // Support both remote URLs and file:// URIs (including dry-run fakes)
  if (url.startsWith("file://")) {
    const src = url.replace(/^file:\/\//, "");
    // Dry-run fakes don't exist on disk — create a 1-second black placeholder
    if (src.includes("/dry-run/")) {
      await createBlackPlaceholder(localPath, 1);
      return;
    }
    await fs.copyFile(src, localPath);
    return;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${url} → HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(localPath, buf);
}

async function createBlackPlaceholder(outPath: string, durationSec: number): Promise<void> {
  await runFfmpeg([
    "-f", "lavfi",
    "-i", `color=black:s=1280x720:d=${durationSec}:r=30`,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-y",
    outPath,
  ]);
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code: number) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}\n${stderr.slice(-2000)}`));
    });
  });
}

async function probeDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    let out = "";
    proc.stdout.on("data", (d: Buffer) => (out += d.toString()));
    proc.on("close", () => resolve(parseFloat(out.trim()) || 0));
    proc.on("error", () => resolve(0));
  });
}
