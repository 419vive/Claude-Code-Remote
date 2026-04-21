/**
 * match_to_vehicle.ts
 *
 * Reads downloaded IG videos from scripts/ig-sync/ig-raw/, extracts vehicle
 * signals from the post caption, and proposes matches against the live
 * vehicles table. Does NOT write to DB — outputs a match plan as JSON
 * that an operator can review and confirm.
 *
 * Usage:
 *   npx tsx scripts/ig-sync/match_to_vehicle.ts                # dry-run plan
 *   npx tsx scripts/ig-sync/match_to_vehicle.ts --apply        # write videoUrl back via API
 *   npx tsx scripts/ig-sync/match_to_vehicle.ts --id ABC123    # single shortcode
 *
 * Matching strategy (in priority order):
 *   1. Exact externalId/sourceUrl match if caption contains 8891 URL
 *   2. brand + model + modelYear all present → candidate
 *   3. brand + model → candidate (ambiguous — flagged for manual review)
 *   4. Anything else → unmatched
 *
 * Output: scripts/ig-sync/match-plan.json
 */

import fs from "fs";
import path from "path";

interface IgInfoJson {
  id: string;
  title?: string;
  description?: string;
  uploader?: string;
  upload_date?: string;
  webpage_url?: string;
  caption?: string;
}

interface VehicleRow {
  id: number;
  externalId: string;
  sourceUrl: string | null;
  brand: string;
  model: string;
  modelYear: string | null;
  color: string | null;
  status: string;
  videoUrl: string | null;
}

interface MatchProposal {
  shortcode: string;
  mp4Path: string;
  caption: string;
  match:
    | { type: "exact-url"; vehicleId: number; confidence: 1.0 }
    | { type: "brand-model-year"; vehicleId: number; confidence: 0.85 }
    | { type: "brand-model"; vehicleId: number; candidates: number[]; confidence: 0.6 }
    | { type: "unmatched"; reason: string };
}

const IG_RAW_DIR = path.resolve(__dirname, "ig-raw");
const OUT_FILE = path.resolve(__dirname, "match-plan.json");

const BRAND_ALIASES: Record<string, string> = {
  toyota: "Toyota", 豐田: "Toyota", 豐: "Toyota",
  honda: "Honda", 本田: "Honda",
  nissan: "Nissan", 日產: "Nissan",
  mazda: "Mazda", 馬自達: "Mazda",
  ford: "Ford", 福特: "Ford",
  mitsubishi: "Mitsubishi", 三菱: "Mitsubishi",
  suzuki: "Suzuki", 鈴木: "Suzuki",
  lexus: "Lexus", 凌志: "Lexus",
  bmw: "BMW", audi: "Audi", benz: "Benz", 賓士: "Benz",
  hyundai: "Hyundai", 現代: "Hyundai",
  kia: "Kia", 起亞: "Kia",
  vw: "Volkswagen", volkswagen: "Volkswagen", 福斯: "Volkswagen",
  volvo: "Volvo", 富豪: "Volvo",
};

function normalizeBrand(raw: string): string | null {
  const k = raw.trim().toLowerCase();
  return BRAND_ALIASES[k] ?? null;
}

function extractBrandModelYear(caption: string): {
  brand?: string;
  model?: string;
  modelYear?: string;
  sourceUrl?: string;
} {
  const out: { brand?: string; model?: string; modelYear?: string; sourceUrl?: string } = {};

  // 8891 source URL hint
  const urlMatch = caption.match(/https?:\/\/[^\s]*8891\.com\.tw[^\s]*/);
  if (urlMatch) out.sourceUrl = urlMatch[0];

  // Year — 4-digit 19xx/20xx OR Taiwan ROC year (105-130 ≈ 2016-2041)
  // Accept "2019", "19年", "108年式"
  const yearMatch =
    caption.match(/\b(19|20)\d{2}\b/) ||
    caption.match(/(\d{2,3})\s*年式?/);
  if (yearMatch) {
    const raw = yearMatch[0].replace(/[^0-9]/g, "");
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n)) {
      if (n >= 1990 && n <= 2100) out.modelYear = String(n);
      else if (n >= 80 && n <= 130) out.modelYear = String(n + 1911); // ROC → AD
    }
  }

  // Brand — try each alias
  for (const [alias, canonical] of Object.entries(BRAND_ALIASES)) {
    const re = new RegExp(`(^|[^A-Za-z])${alias.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}([^A-Za-z]|$)`, "i");
    if (re.test(caption)) {
      out.brand = canonical;
      break;
    }
  }

  // Model — cheap heuristic: look for common model names after brand.
  // Captions usually say "Toyota Camry" or "Camry 2019" etc.
  const MODEL_HINTS = [
    "Camry", "Altis", "RAV4", "Corolla", "Vios", "Yaris", "Prius", "Sienta", "Sienna",
    "Civic", "Accord", "CR-V", "CRV", "HR-V", "Fit", "City",
    "Sentra", "Tiida", "X-Trail", "Kicks",
    "CX-3", "CX-5", "CX-30", "MX-5", "Mazda3",
    "Focus", "Fiesta", "Kuga", "Escape", "Mondeo",
    "Outlander", "Lancer", "Colt",
    "SX4", "Swift", "Vitara",
    "ES", "RX", "NX", "LS", "IS", "GS",
    "320i", "520i", "X1", "X3", "X5", "X6",
    "A4", "A6", "Q3", "Q5", "Q7",
    "C-Class", "E-Class", "GLC", "GLE", "S-Class",
    "Elantra", "Tucson", "Santa Fe",
    "Golf", "Tiguan", "Passat", "Polo",
    "XC60", "XC90", "V40", "S60",
  ];
  for (const m of MODEL_HINTS) {
    const re = new RegExp(`(^|[^A-Za-z\\u4e00-\\u9fff])${m.replace(/[-]/g, "-?")}([^A-Za-z0-9\\u4e00-\\u9fff]|$)`, "i");
    if (re.test(caption)) {
      out.model = m.toUpperCase() === m ? m : m;
      break;
    }
  }

  return out;
}

async function fetchVehicles(apiBase: string): Promise<VehicleRow[]> {
  const res = await fetch(`${apiBase}/api/trpc/vehicle.list?input=${encodeURIComponent(JSON.stringify({ limit: 500 }))}`);
  if (!res.ok) throw new Error(`Vehicle API returned ${res.status}`);
  const data = await res.json();
  return (data?.result?.data?.items ?? []) as VehicleRow[];
}

function scoreMatch(hint: ReturnType<typeof extractBrandModelYear>, v: VehicleRow): MatchProposal["match"] | null {
  if (hint.sourceUrl && v.sourceUrl && hint.sourceUrl.includes(v.sourceUrl)) {
    return { type: "exact-url", vehicleId: v.id, confidence: 1.0 };
  }
  const brandMatch = hint.brand && hint.brand.toLowerCase() === v.brand.toLowerCase();
  const modelMatch = hint.model && v.model.toLowerCase().includes(hint.model.toLowerCase());
  const yearMatch = hint.modelYear && hint.modelYear === v.modelYear;

  if (brandMatch && modelMatch && yearMatch) {
    return { type: "brand-model-year", vehicleId: v.id, confidence: 0.85 };
  }
  if (brandMatch && modelMatch) {
    return { type: "brand-model", vehicleId: v.id, candidates: [v.id], confidence: 0.6 };
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const shouldApply = args.includes("--apply");
  const idIdx = args.indexOf("--id");
  const onlyId = idIdx >= 0 ? args[idIdx + 1] : null;
  const apiBase = process.env.API_URL || "http://localhost:3000";

  if (!fs.existsSync(IG_RAW_DIR)) {
    console.error(`ERROR: ${IG_RAW_DIR} does not exist. Run download_ig_videos.py first.`);
    process.exit(1);
  }

  const infoFiles = fs.readdirSync(IG_RAW_DIR).filter((f) => f.endsWith(".info.json"));
  console.log(`Found ${infoFiles.length} downloaded IG posts in ${IG_RAW_DIR}.`);

  let vehicles: VehicleRow[];
  try {
    vehicles = await fetchVehicles(apiBase);
  } catch (e: any) {
    console.error(`ERROR: could not fetch vehicles from ${apiBase}: ${e.message}`);
    console.error("Hint: start dev server with `npm run dev` in kun-auto-chatbot/");
    process.exit(2);
  }
  console.log(`Loaded ${vehicles.length} vehicles from DB.`);

  const proposals: MatchProposal[] = [];
  for (const file of infoFiles) {
    const info = JSON.parse(fs.readFileSync(path.join(IG_RAW_DIR, file), "utf8")) as IgInfoJson;
    const shortcode = info.id;
    if (onlyId && shortcode !== onlyId) continue;

    const mp4Path = path.join(IG_RAW_DIR, `${shortcode}.mp4`);
    if (!fs.existsSync(mp4Path)) {
      proposals.push({ shortcode, mp4Path, caption: "", match: { type: "unmatched", reason: "mp4 missing" } });
      continue;
    }

    const caption = info.description || info.title || info.caption || "";
    const hint = extractBrandModelYear(caption);

    let best: { score: MatchProposal["match"]; v: VehicleRow } | null = null;
    for (const v of vehicles) {
      const score = scoreMatch(hint, v);
      if (!score) continue;
      if (!best || ("confidence" in score && score.confidence > ("confidence" in best.score ? best.score.confidence : 0))) {
        best = { score, v };
      }
    }

    if (!best) {
      proposals.push({
        shortcode,
        mp4Path,
        caption,
        match: { type: "unmatched", reason: `no brand/model hit (hint=${JSON.stringify(hint)})` },
      });
    } else {
      proposals.push({ shortcode, mp4Path, caption, match: best.score });
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(proposals, null, 2), "utf8");
  const matched = proposals.filter((p) => p.match.type !== "unmatched").length;
  console.log(`\nMatch plan written to ${OUT_FILE}`);
  console.log(`  Matched: ${matched}`);
  console.log(`  Unmatched: ${proposals.length - matched}`);
  console.log(`  By confidence: exact-url=${proposals.filter((p) => p.match.type === "exact-url").length}, brand-model-year=${proposals.filter((p) => p.match.type === "brand-model-year").length}, brand-model=${proposals.filter((p) => p.match.type === "brand-model").length}`);

  if (!shouldApply) {
    console.log("\nReview match-plan.json, then re-run with --apply to write videoUrl to DB.");
    return;
  }

  // --apply mode: write videoUrl back via admin API
  // NOTE: upload to VideoDB happens separately via scripts/videodb/upload_vehicle.py
  console.log("\n--apply mode not yet connected to DB write path.");
  console.log("Next step (manual for now): upload mp4 to VideoDB, get streaming URL, PATCH vehicle via admin API.");
  console.log("This gate is deliberate — review match-plan.json first before any DB writes.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
