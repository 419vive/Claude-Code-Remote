import type { VehicleForInsert } from "./script-builder";

/**
 * Wire the video pipeline into the existing vehicles table.
 *
 * `db.getVehicleById()` already exists in server/db.ts, so this is just an
 * adapter that reshapes a Vehicle row into the VehicleForInsert shape the
 * script builder expects (and parses the photoUrls field, which is stored as
 * either a JSON array or a pipe-delimited string depending on seed source).
 */

export async function lookupVehicleForInsert(
  vehicleId: number,
): Promise<VehicleForInsert | null> {
  // Dynamic import so the video-pipeline module doesn't force-load the full
  // drizzle client on every dry-run or test.
  const db = await import("../db");
  const vehicle = await db.getVehicleById(vehicleId);
  if (!vehicle) return null;

  const photos = parsePhotoUrls(vehicle.photoUrls);
  if (photos.length === 0) {
    console.warn(`[vehicle-lookup] vehicle ${vehicleId} has no photos — cannot use for placement`);
    return null;
  }

  const priceLabel = vehicle.priceDisplay || `${vehicle.price}萬`;
  const parts = [vehicle.modelYear, vehicle.brand, vehicle.model, vehicle.color, priceLabel].filter(
    (s): s is string => Boolean(s),
  );

  return {
    vehicleId: vehicle.id,
    label: parts.join(" "),
    heroPhotoUrl: photos[0],
  };
}

/**
 * Pick N random vehicles from the live inventory — useful when the brief says
 * "include any car from the showroom" and you want variety across videos.
 */
export async function pickRandomVehiclesForInsert(count: number): Promise<VehicleForInsert[]> {
  const db = await import("../db");
  const available = await db.getAvailableVehicles();

  const shuffled = [...available].sort(() => Math.random() - 0.5);
  const picks: VehicleForInsert[] = [];

  for (const v of shuffled) {
    const photos = parsePhotoUrls(v.photoUrls);
    if (photos.length === 0) continue;
    picks.push({
      vehicleId: v.id,
      label: [v.modelYear, v.brand, v.model, v.color, v.priceDisplay || `${v.price}萬`]
        .filter((s): s is string => Boolean(s))
        .join(" "),
      heroPhotoUrl: photos[0],
    });
    if (picks.length >= count) break;
  }

  return picks;
}

/** The same JSON-or-pipe parser used elsewhere in the codebase */
function parsePhotoUrls(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
    } catch {
      return [];
    }
  }
  return trimmed.split("|").filter((u) => u.trim().length > 0);
}
