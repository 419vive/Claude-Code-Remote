import type { GenerateClipParams, GenerateClipResult, ProviderName } from "../types";

/**
 * Abstract interface every AI video provider must implement.
 *
 * Providers wrap async long-polling APIs (submit → poll → fetch result).
 * Callers only see the synchronous-looking generateClip() contract.
 */
export interface VideoProvider {
  readonly name: ProviderName;
  /** Whether this provider can lock character identity via reference images */
  readonly supportsCharacterRef: boolean;
  /** Whether this provider accepts a SECOND reference (character + product) */
  readonly supportsProductInsert: boolean;
  /** Max clip length the provider will generate in a single call */
  readonly maxClipDurationSec: number;
  /** Whether API key is configured */
  readonly isConfigured: boolean;

  generateClip(params: GenerateClipParams): Promise<GenerateClipResult>;
}

/** Raised when an API key is missing or an endpoint is unreachable. */
export class ProviderUnavailableError extends Error {
  constructor(public provider: ProviderName, message: string) {
    super(`[${provider}] ${message}`);
    this.name = "ProviderUnavailableError";
  }
}

/** Sleep helper for polling loops */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Return a fake clip for dry-run mode — no API call, zero cost */
export function dryRunClip(
  provider: ProviderName,
  shotIndex: number,
  durationSec: number,
): GenerateClipResult {
  return {
    videoUrl: `file:///dry-run/${provider}-shot${String(shotIndex).padStart(3, "0")}.mp4`,
    durationSec,
    costUsd: 0,
    provider,
    dryRun: true,
  };
}

/**
 * Poll an async generation job until it completes.
 * Times out after maxAttempts * intervalMs milliseconds.
 */
export async function pollUntilComplete<T>(
  fetcher: () => Promise<T>,
  isDone: (state: T) => boolean,
  isFailed: (state: T) => boolean,
  options: { intervalMs?: number; maxAttempts?: number } = {},
): Promise<T> {
  const intervalMs = options.intervalMs ?? 5_000;
  const maxAttempts = options.maxAttempts ?? 120; // 10 min default
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(intervalMs);
    const state = await fetcher();
    if (isDone(state)) return state;
    if (isFailed(state)) throw new Error("Generation job reported failure");
  }
  throw new Error(`Generation timeout after ${(maxAttempts * intervalMs) / 1000}s`);
}
