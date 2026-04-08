import type { GenerateClipParams, GenerateClipResult } from "../types";
import { ProviderUnavailableError, VideoProvider, dryRunClip, pollUntilComplete } from "./base";

/**
 * Kling AI 3.0 (Kuaishou) — Multi-Elements is THE killer feature for
 * product placement: you can reference a character image AND a car image in
 * the SAME prompt and Kling composites them into one coherent shot.
 *
 * Pricing (April 2026):
 *   Free:     66 credits/day    (evaluation only)
 *   Standard: $10 /mo    660 credits
 *   Pro:      $25.99 /mo 3,000 credits
 *   Premier:  $64.99 /mo 8,000 credits     ← recommended starting point
 *   Ultra:    $127.99-$159.99 /mo 26,000 credits  ← heavy production
 *
 * Credit costs:
 *   5s Standard video    ≈ 20 credits
 *   5s Pro video         ≈ 35 credits
 *   10s Pro 1080p video  ≈ 200 credits
 *
 * Multi-Elements: up to 4 reference images in one prompt (character + product + background + prop).
 *   Docs: https://app.klingai.com/global/dev/document-api/
 *
 * Best used for: product placement shots (AI character + real car), multi-character dialogue,
 * wide establishing shots with multiple elements.
 */
const KLING_API = "https://api.klingai.com/v1";

interface KlingTask {
  task_id: string;
  task_status: "submitted" | "processing" | "succeed" | "failed";
  task_result?: { videos: Array<{ url: string; duration: string }> };
  task_status_msg?: string;
}

type KlingMode = "std" | "pro";

export class KlingProvider implements VideoProvider {
  readonly name = "kling" as const;
  readonly supportsCharacterRef = true;
  readonly supportsProductInsert = true;
  readonly maxClipDurationSec = 10;

  constructor(
    private readonly apiKey: string = process.env.KLING_API_KEY ?? "",
    private readonly accessKey: string = process.env.KLING_ACCESS_KEY ?? "",
    private readonly defaultMode: KlingMode = (process.env.KLING_MODE as KlingMode) ?? "std",
  ) {}

  get isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async generateClip(params: GenerateClipParams): Promise<GenerateClipResult> {
    if (params.dryRun) return dryRunClip(this.name, params.shot.index, params.shot.durationSec);
    if (!this.isConfigured)
      throw new ProviderUnavailableError(this.name, "KLING_API_KEY not set");

    // Multi-Elements: up to 4 reference images. Pack character(s) first, then products.
    const elements = [...params.characterRefs, ...params.productRefs].slice(0, 4).map((url, i) => ({
      input_image: url,
      element_type: i < params.characterRefs.length ? "subject" : "product",
    }));

    const hasRefs = elements.length > 0;
    const endpoint = hasRefs
      ? `${KLING_API}/videos/multi-image2video`
      : `${KLING_API}/videos/text2video`;

    const body: Record<string, unknown> = {
      model_name: "kling-v2",
      prompt: params.shot.visualPrompt,
      camera_control: params.shot.cameraMove
        ? { type: this.mapCameraMove(params.shot.cameraMove) }
        : undefined,
      mode: this.defaultMode,
      duration: String(Math.min(params.shot.durationSec, this.maxClipDurationSec)),
      aspect_ratio: "16:9",
    };
    if (hasRefs) body.image_list = elements;

    const submit = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "X-Access-Key": this.accessKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!submit.ok) {
      throw new Error(`Kling submit ${submit.status}: ${await submit.text()}`);
    }
    const { data } = (await submit.json()) as { data: { task_id: string } };

    const final = await pollUntilComplete<KlingTask>(
      async () => {
        const res = await fetch(`${KLING_API}/videos/task/${data.task_id}`, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        });
        const json = (await res.json()) as { data: KlingTask };
        return json.data;
      },
      (s) => s.task_status === "succeed" && !!s.task_result?.videos?.[0]?.url,
      (s) => s.task_status === "failed",
    );

    return {
      videoUrl: final.task_result!.videos[0].url,
      durationSec: params.shot.durationSec,
      costUsd: this.estimateCost(params.shot.durationSec),
      provider: this.name,
      dryRun: false,
    };
  }

  private mapCameraMove(cam: string): string {
    const m = cam.toLowerCase();
    if (m.includes("dolly") || m.includes("push")) return "forward_up";
    if (m.includes("orbit")) return "horizontal";
    if (m.includes("pullback") || m.includes("pull")) return "backward_down";
    if (m.includes("tilt")) return "vertical";
    return "static";
  }

  /** Credit-to-USD estimate based on Premier plan ($64.99 / 8000 credits ≈ $0.00812/credit) */
  private estimateCost(durationSec: number): number {
    const creditsPer5s = this.defaultMode === "pro" ? 35 : 20;
    const credits = (creditsPer5s / 5) * durationSec;
    return credits * 0.00812;
  }
}
