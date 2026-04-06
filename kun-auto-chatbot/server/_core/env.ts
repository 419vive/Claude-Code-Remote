function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const isProduction = process.env.NODE_ENV === "production";

export const ENV = {
  cookieSecret: isProduction ? requireEnv("JWT_SECRET") : (process.env.JWT_SECRET ?? "dev-only-secret"),
  databaseUrl: requireEnv("DATABASE_URL"),
  googleAiApiKey: requireEnv("GOOGLE_AI_API_KEY"),
  isProduction,
  appId: process.env.VITE_APP_ID ?? "kun-auto-chatbot",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  forgeApiUrl: process.env.FORGE_API_URL ?? "",
  forgeApiKey: process.env.FORGE_API_KEY ?? "",
  adminUsername: process.env.ADMIN_USERNAME ?? "admin",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  // Anthropic Claude — used for generating cinematic video prompts
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  // Higgsfield AI — DoP Turbo cinematic video (fallback)
  higgsFieldCredentials: process.env.HIGGSFIELD_CREDENTIALS ?? "", // KEY_ID:KEY_SECRET
  // Seedance 2.0 — ByteDance video model via third-party API (primary, cheaper)
  seedanceApiKey: process.env.SEEDANCE_API_KEY ?? "",
  // Luma AI Dream Machine — high-quality motion, keyframe control
  lumaApiKey: process.env.LUMA_API_KEY ?? "",
  // YouTube Data API — upload generated videos
  youtubeClientId: process.env.YOUTUBE_CLIENT_ID ?? "",
  youtubeClientSecret: process.env.YOUTUBE_CLIENT_SECRET ?? "",
  youtubeRefreshToken: process.env.YOUTUBE_REFRESH_TOKEN ?? "",
  // ElevenLabs — AI voiceover
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ?? "",
  // Suno AI — background music generation (third-party wrapper, fallback)
  sunoApiKey: process.env.SUNO_API_KEY ?? "",
  sunoBaseUrl: process.env.SUNO_BASE_URL ?? "https://api.sunoapi.org",
  // Mubert — AI music generation, fully automated (primary BGM)
  mubertApiKey: process.env.MUBERT_API_KEY ?? "",
  // Black Forest Labs — FLUX.2 Pro image generation (primary, better than via Higgsfield)
  bflApiKey: process.env.BFL_API_KEY ?? "",
};
