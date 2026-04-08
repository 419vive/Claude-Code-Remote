import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { orchestrate } from "./orchestrator";
import { ProviderRegistry } from "./providers";
import type { VideoProvider } from "./providers";
import type { GenerateClipParams, GenerateClipResult, Script } from "./types";
import { offlineStubScript } from "./script-builder";

// ============ MOCK PROVIDER ============
// Pure mock — records every call, returns fake clips instantly.
// Using London-school TDD: test the orchestrator's behavior by verifying
// which collaborators it talks to, not by actually hitting any network.

class MockProvider implements VideoProvider {
  readonly name = "seedance" as const; // use a real name so pickFor() can find it
  readonly supportsCharacterRef = true;
  readonly supportsProductInsert = true;
  readonly maxClipDurationSec = 10;
  readonly isConfigured = true;
  calls: GenerateClipParams[] = [];

  async generateClip(params: GenerateClipParams): Promise<GenerateClipResult> {
    this.calls.push(params);
    return {
      videoUrl: `file:///mock/shot${params.shot.index}.mp4`,
      durationSec: params.shot.durationSec,
      costUsd: 0.10,
      provider: "seedance",
      dryRun: false,
    };
  }
}

describe("orchestrate", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "video-pipeline-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("generates a clip for every shot in the script", async () => {
    const mock = new MockProvider();
    const registry = new ProviderRegistry([mock]);
    const script: Script = offlineStubScript({
      brief: "Test video",
      characters: [],
    });

    const project = await orchestrate({
      script,
      outputDir: tmpDir,
      registry,
      dryRun: true, // avoid audio/music/subtitles network calls
    });

    expect(project.clips).toHaveLength(script.shots.length);
    expect(project.clips.every((c) => c.videoUrl.length > 0)).toBe(true);
  });

  it("reports zero cost for dry runs", async () => {
    const mock = new MockProvider();
    const registry = new ProviderRegistry([mock]);
    const script = offlineStubScript({ brief: "Dry run test", characters: [] });

    const project = await orchestrate({
      script,
      outputDir: tmpDir,
      registry,
      dryRun: true,
    });

    expect(project.totalCostUsd).toBe(0);
    // Mock provider isn't called when dryRun=true — the base.ts dryRunClip() shortcut fires first
    // … actually our MockProvider IS called (it doesn't check dryRun) — so let's assert it DID get called
    expect(mock.calls.length).toBeGreaterThan(0);
    // And each call had dryRun=true
    expect(mock.calls.every((c) => c.dryRun === true)).toBe(true);
  });

  it("creates a project output directory", async () => {
    const registry = new ProviderRegistry([new MockProvider()]);
    const script = offlineStubScript({ brief: "Dir test", characters: [] });

    const project = await orchestrate({
      script,
      outputDir: tmpDir,
      registry,
      dryRun: true,
    });

    const entries = await fs.readdir(tmpDir);
    expect(entries).toContain(project.id);
  });
});

describe("ProviderRegistry.pickFor", () => {
  it("picks a provider that supports product placement when productInsert is present", () => {
    const mockSeedance = new MockProvider(); // seedance — supports product insert
    const registry = new ProviderRegistry([mockSeedance]);

    const shot = {
      index: 1,
      durationSec: 5,
      visualPrompt: "A car in a showroom",
      dialogue: [],
      characters: [],
      productInsert: {
        vehicleId: 42,
        heroPhotoUrl: "https://example.com/car.jpg",
        label: "2023 Toyota Camry",
        prominence: "hero" as const,
      },
    };

    const picked = registry.pickFor(shot);
    expect(picked.supportsProductInsert).toBe(true);
  });
});
