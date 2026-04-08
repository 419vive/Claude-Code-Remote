/**
 * Barrel export for the video pipeline module.
 * Consumers should import from "./video-pipeline", not individual files.
 */
export * from "./types";
export { ProviderRegistry } from "./providers";
export type { VideoProvider } from "./providers";
export { buildScript, offlineStubScript, insertProduct } from "./script-builder";
export { orchestrate } from "./orchestrator";
export { generateMusic, ttsElevenLabs, ttsFishSpeech, generateSubtitles } from "./audio";
export { assembleFinalVideo } from "./assembler";
export {
  loadCharacters,
  saveCharacters,
  upsertCharacter,
  lockCharacterToProvider,
  findCharacterById,
} from "./character-store";
export { lookupVehicleForInsert, pickRandomVehiclesForInsert } from "./vehicle-lookup";
