import fs from "node:fs/promises";
import path from "node:path";
import type { Character, ProviderName } from "./types";

/**
 * Character persistence — local JSON config file.
 *
 * Characters are created once, trained per provider (Higgsfield Soul ID, etc.),
 * and reused across every video. The `lockedIn` map holds provider-side IDs
 * that guarantee face consistency.
 *
 * Storage: kun-auto-chatbot/config/characters.json (gitignored — contains
 * provider account identifiers). A .example.json is committed for schema reference.
 */

const DEFAULT_CHARACTER_CONFIG = path.resolve("./config/characters.json");

interface CharacterStoreFile {
  version: string;
  characters: Character[];
  updatedAt: string;
}

export async function loadCharacters(
  configPath: string = DEFAULT_CHARACTER_CONFIG,
): Promise<Character[]> {
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(raw) as CharacterStoreFile;
    return parsed.characters ?? [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return []; // No config yet — return empty list
    }
    throw err;
  }
}

export async function saveCharacters(
  characters: Character[],
  configPath: string = DEFAULT_CHARACTER_CONFIG,
): Promise<void> {
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  const file: CharacterStoreFile = {
    version: "1.0",
    characters,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(configPath, JSON.stringify(file, null, 2));
}

export async function upsertCharacter(
  character: Character,
  configPath: string = DEFAULT_CHARACTER_CONFIG,
): Promise<void> {
  const existing = await loadCharacters(configPath);
  const index = existing.findIndex((c) => c.id === character.id);
  if (index >= 0) {
    existing[index] = character;
  } else {
    existing.push(character);
  }
  await saveCharacters(existing, configPath);
}

/**
 * Record the Soul ID (or equivalent) after training a character on a provider.
 * Call this once per (character, provider) pair, then every future shot uses the locked ID.
 */
export async function lockCharacterToProvider(
  characterId: string,
  provider: ProviderName,
  providerSideId: string,
  configPath: string = DEFAULT_CHARACTER_CONFIG,
): Promise<void> {
  const characters = await loadCharacters(configPath);
  const char = characters.find((c) => c.id === characterId);
  if (!char) throw new Error(`Unknown character: ${characterId}`);
  char.lockedIn[provider] = providerSideId;
  await saveCharacters(characters, configPath);
}

export function findCharacterById(characters: Character[], id: string): Character | undefined {
  return characters.find((c) => c.id === id);
}
