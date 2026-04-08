/**
 * Core types for the Kunjia Autos AI character skit video pipeline.
 *
 * Data flow:
 *   user brief (natural language)
 *     → script-builder → Script (structured)
 *     → orchestrator split into Shot[]
 *     → each Shot dispatched to a VideoProvider
 *     → clips + voiceover + music + subtitles
 *     → assembler → final MP4
 *
 * Key concept: every Shot can optionally carry a ProductInsert referencing a
 * real row in the `vehicles` table — that's how dad's cars appear organically
 * inside an AI character skit.
 */

export type ProviderName = "luma" | "higgsfield" | "seedance" | "kling" | "runway";

export type Resolution = "720p" | "1080p";

/** A recurring AI-generated persona used across multiple videos. */
export interface Character {
  /** Stable ID we assign + track across videos */
  id: string;
  name: string;
  /** Short description used inside visual prompts */
  description: string;
  /**
   * Per-provider locked identity. Value is the provider-side ID returned
   * after initial character training (e.g. Higgsfield Soul ID).
   */
  lockedIn: Partial<Record<ProviderName, string>>;
  /** Reference images used for training and as prompt anchors */
  referenceImages: string[];
}

/** A real car from the vehicles DB, dropped into a shot as product placement. */
export interface ProductInsert {
  /** Row in `vehicles` table — accuracy anchor */
  vehicleId: number;
  /** One hero photo from the vehicle's photoUrls JSON */
  heroPhotoUrl: string;
  /** Human label used in the script — e.g. "2019 BMW X1 白色 37.8萬" */
  label: string;
  /** How prominently the car should feature in the shot */
  prominence: "background" | "foreground" | "hero";
}

/** A single camera shot in the final video. */
export interface Shot {
  /** 1-indexed shot number */
  index: number;
  /** Target duration in seconds (most providers cap at 5-10s) */
  durationSec: number;
  /** Visual description of what the audience sees */
  visualPrompt: string;
  /** Dialogue spoken during this shot */
  dialogue: Array<{ characterId: string; line: string }>;
  /** Camera directive (dolly-in, orbit, static, handheld, etc.) */
  cameraMove?: string;
  /** Character IDs appearing in this shot */
  characters: string[];
  /** Optional real car product placement */
  productInsert?: ProductInsert;
  /** Pinned provider — if unset, the registry picks the best one */
  provider?: ProviderName;
}

/** A full 5-minute video brief, ready for orchestration. */
export interface Script {
  title: string;
  /** One-paragraph premise/hook */
  premise: string;
  /** Total target duration in seconds (300 for 5 minutes) */
  targetDurationSec: number;
  /** All characters appearing across this video */
  characters: Character[];
  /** Prompt for the music generator */
  musicPrompt: string;
  /** BCP-47 language tag — "zh-TW", "en", or "zh-TW,en" for bilingual */
  language: string;
  shots: Shot[];
}

export interface GeneratedClip {
  shotIndex: number;
  videoUrl: string;
  durationSec: number;
  provider: ProviderName;
  costUsd: number;
}

export interface VideoProject {
  id: string;
  script: Script;
  clips: GeneratedClip[];
  voiceoverUrl?: string;
  musicUrl?: string;
  subtitleVttUrl?: string;
  finalVideoUrl?: string;
  totalCostUsd: number;
  createdAt: Date;
}

export interface GenerateClipParams {
  shot: Shot;
  /** Character reference image URLs (for providers that support refs) */
  characterRefs: string[];
  /** Product placement image URLs (real car photos) */
  productRefs: string[];
  resolution: Resolution;
  /** If true, return a fake clip without burning API credits */
  dryRun?: boolean;
}

export interface GenerateClipResult {
  videoUrl: string;
  durationSec: number;
  costUsd: number;
  provider: ProviderName;
  dryRun: boolean;
}
