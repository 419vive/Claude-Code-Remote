import type { ProviderName, Shot } from "../types";
import type { VideoProvider } from "./base";
import { HiggsfieldProvider } from "./higgsfield";
import { KlingProvider } from "./kling";
import { LumaProvider } from "./luma";
import { SeedanceProvider } from "./seedance";

/**
 * Provider registry + smart router.
 *
 * The router picks the best provider for each shot based on:
 *   - Is there a product placement? → Kling (multi-elements) or Seedance
 *   - Is there a locked character? → Higgsfield (Soul ID)
 *   - Is it a hero establishing shot? → Luma Ray 2
 *   - Everything else (b-roll, transitions) → Seedance (cheapest)
 *
 * You can always override by pinning shot.provider = "kling" etc.
 */
export class ProviderRegistry {
  private readonly providers = new Map<ProviderName, VideoProvider>();

  constructor(providers: VideoProvider[] = ProviderRegistry.defaultProviders()) {
    for (const p of providers) this.providers.set(p.name, p);
  }

  static defaultProviders(): VideoProvider[] {
    return [new LumaProvider(), new HiggsfieldProvider(), new SeedanceProvider(), new KlingProvider()];
  }

  get(name: ProviderName): VideoProvider {
    const p = this.providers.get(name);
    if (!p) throw new Error(`Unknown provider: ${name}`);
    return p;
  }

  /** Return the provider best suited for this shot's requirements. */
  pickFor(shot: Shot): VideoProvider {
    if (shot.provider) return this.get(shot.provider);

    // Product placement: need multi-reference support
    if (shot.productInsert) {
      const kling = this.providers.get("kling");
      if (kling?.isConfigured) return kling;
      const seedance = this.providers.get("seedance");
      if (seedance?.isConfigured) return seedance;
    }

    // Character-locked dialogue shot: Higgsfield Soul ID is king
    if (shot.characters.length > 0 && shot.dialogue.length > 0) {
      const higgs = this.providers.get("higgsfield");
      if (higgs?.isConfigured) return higgs;
    }

    // Hero establishing shot (no characters, cinematic prompt): Luma Ray 2
    if (shot.characters.length === 0 && /hero|establishing|cinematic|wide/i.test(shot.visualPrompt)) {
      const luma = this.providers.get("luma");
      if (luma?.isConfigured) return luma;
    }

    // Default: Seedance — cheap, fast, handles most b-roll needs
    const seedance = this.providers.get("seedance");
    if (seedance?.isConfigured) return seedance;

    // Last resort: first configured provider
    for (const p of this.providers.values()) {
      if (p.isConfigured) return p;
    }
    throw new Error(
      "No providers configured. Set at least one of LUMA_API_KEY, HIGGSFIELD_API_KEY, SEEDANCE_API_KEY, KLING_API_KEY.",
    );
  }

  /** List all configured providers — useful for CLI health checks */
  configuredProviders(): ProviderName[] {
    return Array.from(this.providers.values())
      .filter((p) => p.isConfigured)
      .map((p) => p.name);
  }
}

export { HiggsfieldProvider, KlingProvider, LumaProvider, SeedanceProvider };
export type { VideoProvider } from "./base";
