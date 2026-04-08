import type { GenerateClipParams, GenerateClipResult } from "../types";
import { ProviderUnavailableError, VideoProvider, dryRunClip, pollUntilComplete } from "./base";

/**
 * Higgsfield Soul ID — photorealistic AI character with locked identity.
 *
 * Pricing (April 2026):
 *   Basic:    $9 /mo
 *   Ultimate: $29 /mo   ← recommended for this pipeline
 *   Creator:  $125 /mo  ← heavy volume
 *
 * Character training: $3 per Soul ID session (20+ photos, ~3 minutes).
 * Once trained, a Soul ID is reused across all videos — the character face
 * stays consistent without drift. This is the killer feature for a skit series.
 *
 * Product placement: NOT a Soul ID strength — use Kling for shots that mix
 * character + car. Use Higgsfield for close-ups, reactions, dialogue shots.
 *
 * Docs: https://docs.higgsfield.ai/
 */
const HIGGSFIELD_API = "https://api.higgsfield.ai/v1";

interface HiggsfieldJob {
  id: string;
  status: "pending" | "processing" | "succeeded" | "failed";
  output?: { video_url: string };
  error?: string;
}

export class HiggsfieldProvider implements VideoProvider {
  readonly name = "higgsfield" as const;
  readonly supportsCharacterRef = true;
  readonly supportsProductInsert = false;
  readonly maxClipDurationSec = 8;

  constructor(
    private readonly apiKey: string = process.env.HIGGSFIELD_API_KEY ?? "",
    /** Subscription tier determines per-clip effective cost */
    private readonly tier: "basic" | "ultimate" | "creator" =
      (process.env.HIGGSFIELD_TIER as "basic" | "ultimate" | "creator") ?? "ultimate",
  ) {}

  get isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async generateClip(params: GenerateClipParams): Promise<GenerateClipResult> {
    if (params.dryRun) return dryRunClip(this.name, params.shot.index, params.shot.durationSec);
    if (!this.isConfigured)
      throw new ProviderUnavailableError(this.name, "HIGGSFIELD_API_KEY not set");

    // The Soul ID is the PROVIDER-side character handle. We expect the caller
    // to have stored it in character.lockedIn.higgsfield after initial training.
    const soulId = params.characterRefs[0]; // upstream passes the Soul ID here

    const body = {
      prompt: params.shot.visualPrompt,
      camera: params.shot.cameraMove ?? "static",
      duration: Math.min(params.shot.durationSec, this.maxClipDurationSec),
      resolution: params.resolution,
      soul_id: soulId, // may be undefined for non-character shots
    };

    const submit = await fetch(`${HIGGSFIELD_API}/videos/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!submit.ok) {
      throw new Error(`Higgsfield submit ${submit.status}: ${await submit.text()}`);
    }
    const { id } = (await submit.json()) as { id: string };

    const final = await pollUntilComplete<HiggsfieldJob>(
      async () => {
        const res = await fetch(`${HIGGSFIELD_API}/videos/${id}`, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        });
        return (await res.json()) as HiggsfieldJob;
      },
      (s) => s.status === "succeeded" && !!s.output?.video_url,
      (s) => s.status === "failed",
    );

    return {
      videoUrl: final.output!.video_url,
      durationSec: params.shot.durationSec,
      costUsd: this.estimateCost(),
      provider: this.name,
      dryRun: false,
    };
  }

  /**
   * Higgsfield is subscription-priced, not per-generation.
   * We return a *marginal* cost of $0 and rely on the monthly subscription.
   * Callers should track subscription cost separately.
   */
  private estimateCost(): number {
    return 0;
  }
}
