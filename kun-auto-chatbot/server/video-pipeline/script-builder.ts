import type { Character, ProductInsert, Script, Shot } from "./types";

/**
 * Script builder — converts a natural-language brief into a structured Script.
 *
 * Two modes:
 *   1. Claude-powered (production)    — calls the project's existing LLM client
 *   2. Offline stub (dev/test)        — returns a canned shot list for dry runs
 *
 * Claude receives:
 *   - User brief (plain English or 中文)
 *   - Available characters (with descriptions)
 *   - Available vehicles to use as product inserts (with specs)
 * Claude returns:
 *   - Title + premise + shot list with dialogue, camera moves, product inserts
 */
export interface BuildScriptParams {
  brief: string;
  characters: Character[];
  availableVehicles?: VehicleForInsert[];
  targetDurationSec?: number;
  language?: string;
  /** If true, skip the LLM call and return a canned stub */
  offline?: boolean;
}

export interface VehicleForInsert {
  vehicleId: number;
  label: string;
  heroPhotoUrl: string;
}

/** A minimal stub that produces a 2-shot script — used for dry-run + tests. */
export function offlineStubScript(params: BuildScriptParams): Script {
  const duration = params.targetDurationSec ?? 300;
  const characters = params.characters.length > 0 ? params.characters : [placeholderCharacter()];
  const shots: Shot[] = [
    {
      index: 1,
      durationSec: 8,
      visualPrompt: `Hero establishing shot. ${characters[0].description}. Cinematic wide angle.`,
      dialogue: [{ characterId: characters[0].id, line: "哈囉大家好，今天我們要來聊聊..." }],
      cameraMove: "slow dolly in",
      characters: [characters[0].id],
    },
    {
      index: 2,
      durationSec: 8,
      visualPrompt: `Reaction shot. ${characters[0].description} looking surprised.`,
      dialogue: [{ characterId: characters[0].id, line: "這真的太誇張了！" }],
      cameraMove: "static close-up",
      characters: [characters[0].id],
      productInsert: params.availableVehicles?.[0]
        ? {
            vehicleId: params.availableVehicles[0].vehicleId,
            heroPhotoUrl: params.availableVehicles[0].heroPhotoUrl,
            label: params.availableVehicles[0].label,
            prominence: "foreground",
          }
        : undefined,
    },
  ];
  return {
    title: "Stub Script",
    premise: params.brief,
    targetDurationSec: duration,
    characters,
    musicPrompt: "upbeat electronic, confident, modern",
    language: params.language ?? "zh-TW",
    shots,
  };
}

function placeholderCharacter(): Character {
  return {
    id: "char-placeholder",
    name: "Placeholder Character",
    description: "Young Asian man, casual streetwear, friendly expression",
    lockedIn: {},
    referenceImages: [],
  };
}

/**
 * Production script builder — calls Claude via the existing llm client.
 * When LLM is unavailable, falls back to the offline stub so dry runs always work.
 */
export async function buildScript(params: BuildScriptParams): Promise<Script> {
  if (params.offline) return offlineStubScript(params);

  try {
    // Dynamic import so tests that don't need the LLM don't pay the module cost
    const { generateContent } = await import("../_core/llm");
    const prompt = buildClaudePrompt(params);
    const response = await generateContent({
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });
    return parseScriptJson(response, params);
  } catch (err) {
    console.warn("[script-builder] LLM unavailable, using stub:", (err as Error).message);
    return offlineStubScript(params);
  }
}

const SYSTEM_PROMPT = `You are the director of a Taiwanese AI character skit series for Kunjia Autos.
Output a JSON Script object matching the Script type. Rules:
- 5-minute target means 30-40 shots of 5-10 seconds each
- Every shot must have dialogue OR strong visual storytelling
- Product inserts (real cars) should feel organic, not like ads
- Bilingual audiences: mix Mandarin dialogue with English text overlays where natural
- Camera moves should be specific: "slow dolly in", "handheld tracking", "static wide", etc.
Return ONLY valid JSON matching the Script schema. No prose.`;

function buildClaudePrompt(params: BuildScriptParams): string {
  const chars = params.characters.map((c) => `- ${c.name} (id=${c.id}): ${c.description}`).join("\n");
  const vehicles = (params.availableVehicles ?? [])
    .map((v) => `- vehicleId=${v.vehicleId}: ${v.label}`)
    .join("\n");
  return `Brief: ${params.brief}

Target duration: ${params.targetDurationSec ?? 300}s
Language: ${params.language ?? "zh-TW"}

Characters available:
${chars || "(none — create one)"}

Vehicles available for product placement:
${vehicles || "(none)"}

Return a Script JSON object.`;
}

function parseScriptJson(raw: string, params: BuildScriptParams): Script {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in LLM response");
  const parsed = JSON.parse(match[0]) as Script;
  // Hydrate characters from params so locked identity survives round-trip
  parsed.characters = params.characters.length > 0 ? params.characters : parsed.characters;
  return parsed;
}

/** Helper: attach a ProductInsert to an existing shot */
export function insertProduct(shot: Shot, insert: ProductInsert): Shot {
  return { ...shot, productInsert: insert };
}
