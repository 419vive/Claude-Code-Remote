import type { GenerateClipParams, GenerateClipResult } from "../types";
import { ProviderUnavailableError, VideoProvider, dryRunClip, pollUntilComplete } from "./base";

/**
 * Seedance 2.0 (ByteDance) — cheap, fast, Chinese-market-friendly.
 *
 * Pricing (April 2026):
 *   Volcengine official:   ~$0.14/sec  →  $1.12 per 8s clip (expensive)
 *   Third-party (PiAPI):   ~$0.022/sec →  $0.18 per 8s clip (~100x cheaper than Sora 2)
 *
 * We default to PiAPI because that's the only way to run Seedance at scale
 * without blowing the budget. Volcengine is a fallback with `SEEDANCE_ENDPOINT`.
 *
 * Character consistency: good via reference image input.
 * Product placement: decent for single-reference shots.
 * Best used for: bulk b-roll, transition shots, scenic backgrounds, cutaways.
 *
 * Docs: https://piapi.ai/docs/seedance-api
 */
const DEFAULT_ENDPOINT = "https://api.piapi.ai/api/v1/task";

interface SeedanceTask {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  output?: { video_url: string };
  error?: { message: string };
}

export class SeedanceProvider implements VideoProvider {
  readonly name = "seedance" as const;
  readonly supportsCharacterRef = true;
  readonly supportsProductInsert = true;
  readonly maxClipDurationSec = 10;

  constructor(
    private readonly apiKey: string = process.env.SEEDANCE_API_KEY ?? "",
    private readonly endpoint: string = process.env.SEEDANCE_ENDPOINT ?? DEFAULT_ENDPOINT,
    /** USD per generated second — defaults to PiAPI rate */
    private readonly ratePerSec: number = Number(process.env.SEEDANCE_RATE_USD_PER_SEC ?? "0.022"),
  ) {}

  get isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async generateClip(params: GenerateClipParams): Promise<GenerateClipResult> {
    if (params.dryRun) return dryRunClip(this.name, params.shot.index, params.shot.durationSec);
    if (!this.isConfigured)
      throw new ProviderUnavailableError(this.name, "SEEDANCE_API_KEY not set");

    const referenceImages = [...params.characterRefs, ...params.productRefs].slice(0, 4);
    const body = {
      model: "seedance-2.0-pro",
      task_type: referenceImages.length > 0 ? "image2video" : "text2video",
      input: {
        prompt: params.shot.visualPrompt,
        camera: params.shot.cameraMove,
        duration: Math.min(params.shot.durationSec, this.maxClipDurationSec),
        resolution: params.resolution,
        image: referenceImages[0],
        reference_images: referenceImages.slice(1),
      },
    };

    const submit = await fetch(this.endpoint, {
      method: "POST",
      headers: { "x-api-key": this.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!submit.ok) {
      throw new Error(`Seedance submit ${submit.status}: ${await submit.text()}`);
    }
    const { task_id } = (await submit.json()) as { task_id: string };

    const final = await pollUntilComplete<SeedanceTask>(
      async () => {
        const res = await fetch(`${this.endpoint}/${task_id}`, {
          headers: { "x-api-key": this.apiKey },
        });
        return (await res.json()) as SeedanceTask;
      },
      (s) => s.status === "completed" && !!s.output?.video_url,
      (s) => s.status === "failed",
    );

    return {
      videoUrl: final.output!.video_url,
      durationSec: params.shot.durationSec,
      costUsd: this.ratePerSec * params.shot.durationSec,
      provider: this.name,
      dryRun: false,
    };
  }
}
