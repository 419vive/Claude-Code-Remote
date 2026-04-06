/**
 * YouTube Data API v3 upload service.
 *
 * Uploads a video (from URL) to the configured YouTube channel
 * using OAuth2 refresh-token flow.
 */
import { ENV } from "./env";
import { logger } from "../logger";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_UPLOAD_URL =
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";

export type YouTubeUploadInput = {
  title: string;
  description: string;
  tags: string[];
  videoUrl: string;
  privacyStatus?: "public" | "unlisted" | "private";
};

export type YouTubeUploadResult = {
  videoId: string;
  youtubeUrl: string;
};

/**
 * Exchange refresh token for a fresh access token.
 */
async function getAccessToken(): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: ENV.youtubeClientId,
      client_secret: ENV.youtubeClientSecret,
      refresh_token: ENV.youtubeRefreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`YouTube OAuth token refresh failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Download video bytes from a URL.
 */
async function downloadVideo(url: string): Promise<Buffer> {
  logger.info("YouTube", `Downloading video from ${url.substring(0, 80)}...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download video (${res.status})`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload a video to YouTube.
 *
 * Flow:
 * 1. Download the video from Higgsfield's URL
 * 2. Get OAuth2 access token
 * 3. Start a resumable upload session
 * 4. Upload the video bytes
 */
export async function uploadToYouTube(
  input: YouTubeUploadInput
): Promise<YouTubeUploadResult> {
  if (!ENV.youtubeClientId || !ENV.youtubeClientSecret || !ENV.youtubeRefreshToken) {
    throw new Error(
      "YouTube API credentials not configured (YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN)"
    );
  }

  // 1. Download video
  const videoBuffer = await downloadVideo(input.videoUrl);
  logger.info("YouTube", `Downloaded ${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB`);

  // 2. Get access token
  const accessToken = await getAccessToken();

  // 3. Initiate resumable upload
  const metadata = {
    snippet: {
      title: input.title,
      description: input.description,
      tags: input.tags,
      categoryId: "2", // Autos & Vehicles
      defaultLanguage: "zh-TW",
    },
    status: {
      privacyStatus: input.privacyStatus ?? "private", // Default to private for safety
      selfDeclaredMadeForKids: false,
    },
  };

  const initiateRes = await fetch(YOUTUBE_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(videoBuffer.length),
      "X-Upload-Content-Type": "video/mp4",
    },
    body: JSON.stringify(metadata),
  });

  if (!initiateRes.ok) {
    const detail = await initiateRes.text().catch(() => "");
    throw new Error(`YouTube upload initiation failed (${initiateRes.status}): ${detail}`);
  }

  const uploadUrl = initiateRes.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("YouTube did not return a resumable upload URL");
  }

  // 4. Upload video bytes
  logger.info("YouTube", "Uploading video bytes...");
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(videoBuffer.length),
    },
    body: videoBuffer,
  });

  if (!uploadRes.ok) {
    const detail = await uploadRes.text().catch(() => "");
    throw new Error(`YouTube upload failed (${uploadRes.status}): ${detail}`);
  }

  const uploadData = (await uploadRes.json()) as { id: string };
  const videoId = uploadData.id;
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  logger.info("YouTube", `Upload complete: ${youtubeUrl}`);
  return { videoId, youtubeUrl };
}
