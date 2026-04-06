/**
 * ElevenLabs Text-to-Speech service.
 *
 * Generates natural-sounding voiceover narration for video scenes.
 * Returns raw audio bytes (mp3).
 */
import { ENV } from "./env";
import { logger } from "../logger";

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";
const ELEVENLABS_TIMEOUT_MS = 30_000;

// Default voice: a warm, professional Mandarin-capable voice
// You can change this to any ElevenLabs voice ID
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // "Rachel" — clear, warm
const DEFAULT_MODEL_ID = "eleven_multilingual_v2"; // Supports Chinese

export type TTSInput = {
  text: string;
  voiceId?: string;
  modelId?: string;
};

/**
 * Generate speech audio from text. Returns MP3 audio buffer.
 */
export async function generateSpeech(input: TTSInput): Promise<Buffer> {
  if (!ENV.elevenLabsApiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }

  const voiceId = input.voiceId || DEFAULT_VOICE_ID;
  const modelId = input.modelId || DEFAULT_MODEL_ID;

  logger.info("ElevenLabs", `Generating speech (${input.text.length} chars)...`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ELEVENLABS_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": ENV.elevenLabsApiKey,
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: input.text,
          model_id: modelId,
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error (${response.status}): ${errorText.substring(0, 500)}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    logger.info("ElevenLabs", `Generated ${(buffer.length / 1024).toFixed(0)} KB audio`);
    return buffer;
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      throw new Error(`ElevenLabs request timed out after ${ELEVENLABS_TIMEOUT_MS}ms`);
    }
    throw err;
  }
}

/**
 * Generate voiceover for all scenes and concatenate into one audio file.
 * Returns individual scene audio buffers (for precise timing in Remotion).
 */
export async function generateSceneNarrations(
  narrations: string[]
): Promise<Buffer[]> {
  const results: Buffer[] = [];

  for (let i = 0; i < narrations.length; i++) {
    const narration = narrations[i];
    if (!narration.trim()) {
      // Empty narration — push a silent placeholder (minimal mp3)
      results.push(Buffer.alloc(0));
      continue;
    }
    logger.info("ElevenLabs", `Scene ${i + 1}/${narrations.length}: "${narration.substring(0, 40)}..."`);
    const audio = await generateSpeech({ text: narration });
    results.push(audio);
  }

  return results;
}
