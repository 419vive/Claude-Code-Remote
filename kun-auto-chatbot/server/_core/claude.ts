/**
 * Anthropic Claude client for generating cinematic video prompts.
 *
 * Given vehicle data (make, model, year, features, images),
 * Claude crafts a rich cinematic prompt that Higgsfield AI
 * can turn into a professional car showcase video.
 */
import { ENV } from "./env";
import { logger } from "../logger";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const CLAUDE_TIMEOUT_MS = 30_000;

export type VehicleInfo = {
  make: string;
  model: string;
  year: number;
  color?: string;
  mileage?: number;
  price?: number;
  features?: string[];
  imageUrls?: string[];
};

export type VideoPromptResult = {
  cinematicPrompt: string;
  title: string;
  description: string;
  tags: string[];
};

/**
 * Generate a cinematic video prompt + YouTube metadata for a vehicle.
 */
export async function generateVideoPrompt(
  vehicle: VehicleInfo
): Promise<VideoPromptResult> {
  if (!ENV.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const systemPrompt = `你是坤佳汽車的影片創意總監。你專門撰寫 cinematic 二手車展示影片的 prompt，
用於 AI 影片生成工具。你的風格是高級、專業、有電影感的。

你需要產出：
1. cinematicPrompt: 給 AI 影片生成器的英文 prompt（描述鏡頭運動、光影、氛圍）
2. title: YouTube 影片標題（繁體中文，包含車款、年份）
3. description: YouTube 影片描述（繁體中文，含車輛亮點、坤佳汽車聯絡資訊）
4. tags: YouTube 標籤陣列（中英文混合）

回覆必須是 JSON 格式。`;

  const featuresList = vehicle.features?.length
    ? `特色配備: ${vehicle.features.join(", ")}`
    : "";

  const userPrompt = `請為這台車生成 cinematic 影片 prompt：

車輛資訊：
- 品牌/車型: ${vehicle.make} ${vehicle.model}
- 年份: ${vehicle.year}
- 顏色: ${vehicle.color ?? "未指定"}
- 里程數: ${vehicle.mileage != null ? `${vehicle.mileage.toLocaleString()} km` : "未指定"}
- 售價: ${vehicle.price != null ? `NT$ ${vehicle.price.toLocaleString()}` : "面議"}
${featuresList}

回覆 JSON 格式：
{
  "cinematicPrompt": "...",
  "title": "...",
  "description": "...",
  "tags": ["...", "..."]
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ENV.anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Claude API error (${response.status}): ${errorText.substring(0, 500)}`
      );
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };

    const text = data.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("");

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Claude did not return valid JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]) as VideoPromptResult;
    logger.info("Claude", `Generated prompt for ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
    return parsed;
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      throw new Error(`Claude request timed out after ${CLAUDE_TIMEOUT_MS}ms`);
    }
    throw err;
  }
}
