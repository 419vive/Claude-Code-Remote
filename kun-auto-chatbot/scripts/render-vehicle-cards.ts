/**
 * render-vehicle-cards.ts
 *
 * Batch renders LINE/WeChat/IG-shareable vertical video cards for all available vehicles.
 * Uses Remotion's Node.js API to render without the CLI.
 *
 * Usage:
 *   npx tsx scripts/render-vehicle-cards.ts              # Render all available vehicles
 *   npx tsx scripts/render-vehicle-cards.ts --limit 5    # Render first 5 only
 *   npx tsx scripts/render-vehicle-cards.ts --id 42      # Render specific vehicle ID
 *
 * Output: ./output/vehicle-cards/<brand>-<model>-<id>.mp4
 *
 * Optional: Place a royalty-free background music file at
 *   ./public/audio/bgm-upbeat.mp3
 * and it will automatically be included in all videos.
 */

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";

// Minimal vehicle type matching DB schema output
interface VehicleRow {
  id: number;
  title: string | null;
  brand: string;
  model: string;
  modelYear: string | null;
  price: string | number | null;
  priceDisplay: string | null;
  mileage: string | null;
  transmission: string | null;
  fuelType: string | null;
  color: string | null;
  displacement: string | null;
  photoUrls: string | null;
  status: string;
}

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : Infinity;
  const idIdx = args.indexOf("--id");
  const specificId = idIdx >= 0 ? parseInt(args[idIdx + 1]) : null;

  const outputDir = path.resolve("./output/vehicle-cards");
  fs.mkdirSync(outputDir, { recursive: true });

  console.log("Bundling Remotion project...");
  const bundleLocation = await bundle({
    entryPoint: path.resolve("./client/src/remotion/index.ts"),
    webpackOverride: (config) => config,
  });

  // Check for background music
  const musicPath = path.resolve("./public/audio/bgm-upbeat.mp3");
  const hasMusicFile = fs.existsSync(musicPath);
  const musicUrl = hasMusicFile
    ? `file://${musicPath}`
    : undefined;

  if (hasMusicFile) {
    console.log("Background music found: public/audio/bgm-upbeat.mp3");
  } else {
    console.log("No background music file found at public/audio/bgm-upbeat.mp3 — rendering without music.");
    console.log("Tip: Drop a royalty-free MP3 there for automatic music in all videos.");
  }

  // Fetch vehicles from API
  console.log("Fetching vehicle inventory...");
  const apiBase = process.env.API_URL || "http://localhost:3000";
  let vehicles: VehicleRow[] = [];

  try {
    // Try tRPC endpoint
    const res = await fetch(`${apiBase}/api/trpc/vehicle.list?input=${encodeURIComponent(JSON.stringify({ limit: 100 }))}`);
    const data = await res.json();
    vehicles = data?.result?.data?.items || [];
  } catch {
    console.log("API not available — reading from sample data or provide vehicles via stdin");
    console.log("Start your dev server first: npm run dev");
    process.exit(1);
  }

  // Filter
  vehicles = vehicles.filter((v) => v.status === "available");
  if (specificId) {
    vehicles = vehicles.filter((v) => v.id === specificId);
  }
  vehicles = vehicles.slice(0, limit);

  console.log(`Rendering ${vehicles.length} vehicle cards...`);

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "VehicleCard",
  });

  for (const vehicle of vehicles) {
    const photos = parsePhotos(vehicle.photoUrls);
    if (photos.length === 0) {
      console.log(`  Skipping ${vehicle.brand} ${vehicle.model} (no photos)`);
      continue;
    }

    const safeName = `${vehicle.brand}-${vehicle.model}-${vehicle.id}`.replace(/\s+/g, "-");
    const outputPath = path.join(outputDir, `${safeName}.mp4`);

    if (fs.existsSync(outputPath)) {
      console.log(`  Skipping ${safeName} (already exists)`);
      continue;
    }

    const price = vehicle.priceDisplay || `${vehicle.price}`;

    console.log(`  Rendering: ${safeName} (${price}萬)...`);

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: {
        title: vehicle.title || `${vehicle.brand} ${vehicle.model}`,
        brand: vehicle.brand,
        model: vehicle.model,
        modelYear: vehicle.modelYear || undefined,
        price,
        mileage: vehicle.mileage || undefined,
        transmission: vehicle.transmission || undefined,
        fuelType: vehicle.fuelType || undefined,
        color: vehicle.color || undefined,
        displacement: vehicle.displacement || undefined,
        photoUrls: photos,
        musicUrl,
        musicVolume: 0.35,
      },
    });

    console.log(`  ✅ ${outputPath}`);
  }

  console.log(`\nDone! ${vehicles.length} cards saved to ${outputDir}`);
}

function parsePhotos(raw: string | null): string[] {
  if (!raw) return [];
  if (raw.startsWith("[")) {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return raw.split("|").filter((u) => u.trim());
}

main().catch((err) => {
  console.error("Render failed:", err);
  process.exit(1);
});
