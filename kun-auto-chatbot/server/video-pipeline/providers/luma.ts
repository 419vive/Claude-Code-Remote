import type { GenerateClipParams, GenerateClipResult } from "../types";
import { ProviderUnavailableError, VideoProvider, dryRunClip, pollUntilComplete } from "./base";

/**
 * Luma Dream Machine — Ray 2 / Ray 2 Flash
 *
 * Pricing (April 2026):
 *   Ray 2:       $0.0064 / million pixels  →  ~$0.71 per 720p 5s clip
 *   Ray 2 Flash: $0.0022 / million pixels  →  ~$0.24 per 720p 5s clip (3x faster)
 *
 * Character consistency: supports a single keyframe reference image.
 * Product placement: weaker — single-reference model, can't stack character + car.
 * Best used for: hero establishing shots, atmospheric b-roll, solo character shots.
 *
 * Docs: https://docs.lumalabs.ai/docs/api
 */
const LUMA_API = "https://api.lumalabs.ai/dream-machine/v1";
const FPS = 30;

type LumaModel = "ray-2" | "ray-2-flash";

interface LumaGenerationResponse {
  id: string;
  state: "queued" | "dreaming" | "completed" | "failed";
  assets?: { video: string };
  failure_reason?: string;
}

export class LumaProvider implements VideoProvider {
  readonly name = "luma" as const;
  readonly supportsCharacterRef = true;
  readonly supportsProductInsert = false;
  readonly maxClipDurationSec = 10;

  constructor(
    private readonly apiKey: string = process.env.LUMA_API_KEY ?? "",
    private readonly model: LumaModel = (process.env.LUMA_MODEL as LumaModel) ?? "ray-2-flash",
  ) {}

  get isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async generateClip(params: GenerateClipParams): Promise<GenerateClipResult> {
    if (params.dryRun) return dryRunClip(this.name, params.shot.index, params.shot.durationSec);
    if (!this.isConfigured) throw new ProviderUnavailableError(this.name, "LUMA_API_KEY not set");

    const prompt = [
      params.shot.visualPrompt,
      params.shot.cameraMove ? `Camera: ${params.shot.cameraMove}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const body: Record<string, unknown> = {
      generation_type: "video",
      model: this.model,
      prompt,
      aspect_ratio: "16:9",
      resolution: params.resolution,
      duration: `${Math.min(params.shot.durationSec, this.maxClipDurationSec)}s`,
    };
    if (params.characterRefs[0]) {
      body.keyframes = { frame0: { type: "image", url: params.characterRefs[0] } };
    }

    const submit = await fetch(`${LUMA_API}/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!submit.ok) {
      throw new Error(`Luma submit ${submit.status}: ${await submit.text()}`);
    }
    const { id } = (await submit.json()) as { id: string };

    const final = await pollUntilComplete<LumaGenerationResponse>(
      async () => {
        const res = await fetch(`${LUMA_API}/generations/${id}`, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        });
        return (await res.json()) as LumaGenerationResponse;
      },
      (s) => s.state === "completed" && !!s.assets?.video,
      (s) => s.state === "failed",
    );

    return {
      videoUrl: final.assets!.video,
      durationSec: params.shot.durationSec,
      costUsd: this.estimateCost(params.resolution, params.shot.durationSec),
      provider: this.name,
      dryRun: false,
    };
  }

  private estimateCost(resolution: string, durationSec: number): number {
    const pxPerFrame = resolution === "1080p" ? 1920 * 1080 : 1280 * 720;
    const totalMegapixels = (pxPerFrame * FPS * durationSec) / 1_000_000;
    const ratePerMPx = this.model === "ray-2" ? 0.0064 : 0.0022;
    return totalMegapixels * ratePerMPx;
  }
}
