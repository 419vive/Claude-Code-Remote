#!/usr/bin/env tsx
/**
 * create-video.ts — CLI entry point for the AI character skit pipeline.
 *
 * Usage:
 *   # Dry run: print the plan and estimated cost, no API calls
 *   npx tsx scripts/create-video.ts --brief "兩個角色辯論BMW vs 賓士，5分鐘" --dry-run
 *
 *   # Live run: actually generate the video
 *   npx tsx scripts/create-video.ts --brief "..." --duration 300 --language zh-TW
 *
 *   # Specific vehicle for product placement
 *   npx tsx scripts/create-video.ts --brief "..." --vehicle-id 42
 *
 *   # Health check: which providers are configured?
 *   npx tsx scripts/create-video.ts --health
 *
 * Required env vars (set at least ONE video provider):
 *   LUMA_API_KEY                (optional — Luma Ray 2 / Flash)
 *   HIGGSFIELD_API_KEY          (optional — Higgsfield Soul ID)
 *   SEEDANCE_API_KEY            (optional — Seedance via PiAPI)
 *   KLING_API_KEY               (optional — Kling 3.0 Multi-Elements, recommended)
 *   ELEVENLABS_API_KEY          (optional — voice-over, Creator tier $22/mo)
 *   SUNO_API_KEY                (optional — music, Pro tier $10/mo)
 *   FISH_SPEECH_URL             (optional — self-hosted TTS fallback)
 *   ACE_STEP_URL                (optional — self-hosted music fallback)
 *
 * Output: ./output/video-projects/<uuid>/
 *   ├── clip-001.mp4, clip-002.mp4, ...
 *   ├── voiceover.mp3
 *   ├── music.mp3
 *   ├── subtitles.vtt
 *   └── final.mp4 (or final.manifest.json if assembly is deferred)
 */
import path from "node:path";
import {
  orchestrate,
  buildScript,
  ProviderRegistry,
  loadCharacters,
  lookupVehicleForInsert,
  pickRandomVehiclesForInsert,
} from "../server/video-pipeline";
import type { VehicleForInsert } from "../server/video-pipeline/script-builder";

interface CliArgs {
  brief?: string;
  duration: number;
  language: string;
  dryRun: boolean;
  health: boolean;
  vehicleId?: number;
  randomVehicles?: number;
  charactersConfig: string;
  outputDir: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    duration: 300,
    language: "zh-TW",
    dryRun: false,
    health: false,
    charactersConfig: path.resolve("./config/characters.json"),
    outputDir: path.resolve("./output/video-projects"),
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];
    if (flag === "--brief") args.brief = next;
    else if (flag === "--duration") args.duration = parseInt(next, 10);
    else if (flag === "--language") args.language = next;
    else if (flag === "--dry-run") args.dryRun = true;
    else if (flag === "--health") args.health = true;
    else if (flag === "--vehicle-id") args.vehicleId = parseInt(next, 10);
    else if (flag === "--random-vehicles") args.randomVehicles = parseInt(next, 10);
    else if (flag === "--characters") args.charactersConfig = path.resolve(next);
    else if (flag === "--output") args.outputDir = path.resolve(next);
  }
  return args;
}

async function healthCheck(): Promise<void> {
  const registry = new ProviderRegistry();
  const configured = registry.configuredProviders();
  console.log("\n=== Video Pipeline Health Check ===\n");
  console.log("Video providers configured:", configured.length > 0 ? configured.join(", ") : "NONE");
  console.log("ElevenLabs TTS:", process.env.ELEVENLABS_API_KEY ? "✅" : "❌");
  console.log("Suno music:    ", process.env.SUNO_API_KEY ? "✅" : "❌");
  console.log("Fish-Speech:   ", process.env.FISH_SPEECH_URL ? "✅ (fallback)" : "❌");
  console.log("ACE-Step:      ", process.env.ACE_STEP_URL ? "✅ (fallback)" : "❌");
  console.log("\nReady to run?", configured.length > 0 ? "YES (dry-run works without any keys)" : "Dry-run only");
  console.log("");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.health) {
    await healthCheck();
    return;
  }

  if (!args.brief) {
    console.error("Missing --brief. Example:");
    console.error('  npx tsx scripts/create-video.ts --brief "兩個角色討論二手車選購" --dry-run');
    process.exit(1);
  }

  // Load persisted characters (Soul IDs etc. already trained on providers)
  const characters = await loadCharacters(args.charactersConfig);
  if (characters.length > 0) {
    console.log(
      `[create-video] loaded ${characters.length} character(s): ${characters.map((c) => c.name).join(", ")}`,
    );
  } else {
    console.log(
      `[create-video] no characters in ${args.charactersConfig} — script builder will invent one`,
    );
  }

  // Resolve vehicle product inserts from the live inventory DB
  const availableVehicles: VehicleForInsert[] = [];
  if (args.vehicleId) {
    try {
      const v = await lookupVehicleForInsert(args.vehicleId);
      if (v) {
        availableVehicles.push(v);
        console.log(`[create-video] product insert: ${v.label}`);
      } else {
        console.warn(`[create-video] vehicle ${args.vehicleId} has no usable photos`);
      }
    } catch (err) {
      console.warn(`[create-video] vehicle lookup failed (DB unavailable?):`, (err as Error).message);
    }
  }
  if (args.randomVehicles && args.randomVehicles > 0) {
    try {
      const picks = await pickRandomVehiclesForInsert(args.randomVehicles);
      availableVehicles.push(...picks);
      console.log(`[create-video] random inserts: ${picks.map((v) => v.label).join(", ")}`);
    } catch (err) {
      console.warn(`[create-video] random vehicle pick failed:`, (err as Error).message);
    }
  }

  console.log(`[create-video] building script from brief (${args.brief.length} chars)...`);
  const script = await buildScript({
    brief: args.brief,
    characters,
    availableVehicles,
    targetDurationSec: args.duration,
    language: args.language,
    offline: args.dryRun, // dry runs skip LLM to avoid billable Claude calls too
  });

  console.log(`[create-video] script: ${script.title} — ${script.shots.length} shots`);

  const project = await orchestrate({
    script,
    outputDir: args.outputDir,
    dryRun: args.dryRun,
  });

  console.log("\n=== Done ===");
  console.log("Project ID:  ", project.id);
  console.log("Total clips: ", project.clips.length);
  console.log("Total cost:  ", `$${project.totalCostUsd.toFixed(3)}`);
  console.log("Output dir:  ", path.join(args.outputDir, project.id));
}

main().catch((err) => {
  console.error("[create-video] fatal:", err);
  process.exit(1);
});
