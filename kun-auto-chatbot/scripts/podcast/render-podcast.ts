/**
 * render-podcast.ts — Full podcast rendering pipeline.
 *
 * Steps:
 *   1. Load script.json + voices/timing.json for the episode
 *   2. Stitch per-line WAVs + gaps into one master audio track (ffmpeg concat)
 *   3. Query API for the most expensive available vehicle (or use --vehicle-id)
 *   4. Bundle Remotion project + render composition "Podcast"
 *   5. Output: output/podcast/<episodeId>.mp4
 *
 * Usage:
 *   npx tsx scripts/podcast/render-podcast.ts ep01-road-rage
 *   npx tsx scripts/podcast/render-podcast.ts ep01-road-rage --vehicle-id 42
 *   npx tsx scripts/podcast/render-podcast.ts ep01-road-rage --skip-audio-stitch  # audio already stitched
 *
 * Prereqs:
 *   - Run scripts/podcast/generate_voices.py <ep> first
 *   - ffmpeg on PATH (brew install ffmpeg / apt install ffmpeg)
 *   - Dev API running on http://localhost:3000 (or set API_URL)
 */

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import type {
  PodcastScript,
  PodcastTiming,
  PodcastFeaturedVehicle,
  PodcastVideoProps,
} from "../../client/src/remotion/types";

interface VehicleApiRow {
  id: number;
  brand: string;
  model: string;
  modelYear: string | null;
  price: string | number | null;
  priceDisplay: string | null;
  photoUrls: string | null;
  status: string;
}

const REPO_ROOT = path.resolve(__dirname, "../..");

async function loadEpisode(episodeId: string): Promise<{ script: PodcastScript; timing: PodcastTiming; voicesDir: string }> {
  const epDir = path.join(REPO_ROOT, "scripts", "podcast", "episodes", episodeId);
  const scriptPath = path.join(epDir, "script.json");
  const timingPath = path.join(epDir, "voices", "timing.json");
  if (!fs.existsSync(scriptPath)) throw new Error(`Missing: ${scriptPath}`);
  if (!fs.existsSync(timingPath)) throw new Error(`Missing: ${timingPath} — run generate_voices.py first`);
  return {
    script: JSON.parse(fs.readFileSync(scriptPath, "utf8")) as PodcastScript,
    timing: JSON.parse(fs.readFileSync(timingPath, "utf8")) as PodcastTiming,
    voicesDir: path.join(epDir, "voices"),
  };
}

function stitchAudio(timing: PodcastTiming, voicesDir: string, outPath: string): void {
  // Build ffmpeg filter_complex that inserts silence of the right length between clips.
  const inputs: string[] = [];
  const filterParts: string[] = [];
  const concatSegments: string[] = [];

  timing.lines.forEach((line, i) => {
    const wavPath = path.join(voicesDir, line.wav);
    inputs.push("-i", wavPath);
    // Each input i → [i:a]
    filterParts.push(`[${i}:a]aresample=44100[a${i}]`);
    concatSegments.push(`[a${i}]`);

    // Add silence between lines (except after the last)
    if (i < timing.lines.length - 1) {
      const gapMs = timing.gapMsBetweenLines;
      filterParts.push(
        `anullsrc=r=44100:cl=mono:duration=${gapMs}ms[gap${i}]`
      );
      concatSegments.push(`[gap${i}]`);
    }
  });

  // Concat all segments
  const filterComplex = [
    ...filterParts,
    `${concatSegments.join("")}concat=n=${concatSegments.length}:v=0:a=1[out]`,
  ].join(";");

  const args = [
    "-y",
    ...inputs,
    "-filter_complex", filterComplex,
    "-map", "[out]",
    "-c:a", "pcm_s16le",
    "-ar", "44100",
    outPath,
  ];

  // Use spawnSync to avoid shell-escape headaches with the long filter
  const { spawnSync } = require("child_process");
  const result = spawnSync("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
  if (result.status !== 0) {
    const stderr = result.stderr?.toString() ?? "";
    throw new Error(`ffmpeg audio stitch failed: ${stderr.slice(-500)}`);
  }
}

function parsePhotos(raw: string | null): string[] {
  if (!raw) return [];
  if (raw.startsWith("[")) {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return raw.split("|").filter((u) => u.trim());
}

async function pickFeaturedVehicle(apiBase: string, explicitId: number | null): Promise<PodcastFeaturedVehicle | undefined> {
  try {
    const res = await fetch(`${apiBase}/api/trpc/vehicle.list?input=${encodeURIComponent(JSON.stringify({ limit: 500 }))}`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    const vehicles: VehicleApiRow[] = data?.result?.data?.items ?? [];
    const available = vehicles.filter((v) => v.status === "available" && parsePhotos(v.photoUrls).length > 0);
    if (available.length === 0) return undefined;

    let chosen: VehicleApiRow;
    if (explicitId) {
      const found = available.find((v) => v.id === explicitId);
      if (!found) throw new Error(`Vehicle ${explicitId} not found or unavailable`);
      chosen = found;
    } else {
      // Most expensive available
      chosen = available.reduce((best, cur) => {
        const bp = parseFloat(String(best.price ?? 0));
        const cp = parseFloat(String(cur.price ?? 0));
        return cp > bp ? cur : best;
      });
    }

    console.log(`Featured vehicle: ${chosen.brand} ${chosen.model} ${chosen.modelYear ?? ""} (${chosen.priceDisplay ?? chosen.price}萬)`);
    return {
      brand: chosen.brand,
      model: chosen.model,
      modelYear: chosen.modelYear ?? undefined,
      priceDisplay: chosen.priceDisplay ?? undefined,
      photoUrls: parsePhotos(chosen.photoUrls),
    };
  } catch (e: any) {
    console.warn(`Could not fetch vehicle from ${apiBase}: ${e.message}`);
    console.warn("Rendering without featured vehicle. Start `npm run dev` if you want a real car in the background.");
    return undefined;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const episodeId = args.find((a) => !a.startsWith("--")) ?? "ep01-road-rage";
  const vehicleIdIdx = args.indexOf("--vehicle-id");
  const vehicleId = vehicleIdIdx >= 0 ? parseInt(args[vehicleIdIdx + 1]) : null;
  const skipStitch = args.includes("--skip-audio-stitch");
  const apiBase = process.env.API_URL || "http://localhost:3000";

  console.log(`Rendering episode: ${episodeId}`);

  const { script, timing, voicesDir } = await loadEpisode(episodeId);
  console.log(`Loaded script "${script.title}" — ${timing.lines.length} lines, ${(timing.totalDurationMs / 1000).toFixed(1)}s audio`);

  const masterAudioPath = path.join(voicesDir, "master.wav");
  if (!skipStitch || !fs.existsSync(masterAudioPath)) {
    console.log("Stitching audio (ffmpeg)...");
    stitchAudio(timing, voicesDir, masterAudioPath);
    console.log(`  Wrote ${masterAudioPath}`);
  } else {
    console.log(`Audio stitch skipped — using existing ${masterAudioPath}`);
  }

  const featuredVehicle = await pickFeaturedVehicle(apiBase, vehicleId);

  const outputDir = path.join(REPO_ROOT, "output", "podcast");
  fs.mkdirSync(outputDir, { recursive: true });
  const outPath = path.join(outputDir, `${episodeId}.mp4`);

  console.log("Bundling Remotion...");
  const bundleLocation = await bundle({
    entryPoint: path.resolve(REPO_ROOT, "client/src/remotion/index.ts"),
    webpackOverride: (config) => config,
  });

  const props: PodcastVideoProps = {
    script,
    timing,
    audioUrl: `file://${masterAudioPath}`,
    featuredVehicle,
  };

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "Podcast",
    inputProps: props,
  });

  const durationFrames = Math.ceil((timing.totalDurationMs / 1000) * 30);
  console.log(`Rendering ${durationFrames} frames (${(durationFrames / 30).toFixed(1)}s at 30fps)...`);
  console.log(`Output: ${outPath}`);

  await renderMedia({
    composition: { ...composition, durationInFrames: durationFrames },
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outPath,
    inputProps: props,
    onProgress: ({ progress }) => {
      if (progress > 0) process.stdout.write(`\r  ${(progress * 100).toFixed(1)}%   `);
    },
  });

  console.log(`\nDone! ${outPath}`);
  console.log(`File size: ${(fs.statSync(outPath).size / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((e) => {
  console.error("Render failed:", e);
  process.exit(1);
});
