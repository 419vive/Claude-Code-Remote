/**
 * Claude-powered storyboard generator for cinematic vehicle ads.
 *
 * Generates a multi-scene script with:
 *   - Scene descriptions (characters, setting, action)
 *   - Camera directions (for Higgsfield image-to-video)
 *   - Voiceover narration (for ElevenLabs TTS)
 *   - Music mood (for Suno AI BGM)
 *   - YouTube metadata
 */
import { ENV } from "./env";
import { logger } from "../logger";
import type { VehicleInfo } from "./claude";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const CLAUDE_TIMEOUT_MS = 60_000; // longer for storyboard

export type Scene = {
  /** Scene number (1-based) */
  sceneNumber: number;
  /** Scene duration in seconds */
  durationSec: number;
  /** English prompt for AI image generation (character + setting + mood) */
  imagePrompt: string;
  /** English prompt for Higgsfield video motion (camera movement) */
  motionPrompt: string;
  /** 繁體中文 voiceover narration for this scene */
  narration: string;
  /** Brief description of what happens */
  description: string;
};

export type Storyboard = {
  /** Unique story concept / theme */
  concept: string;
  /** Target audience */
  audience: string;
  /** Overall mood for BGM */
  musicMood: string;
  /** English description for Suno AI to generate BGM */
  musicPrompt: string;
  /** All scenes in order */
  scenes: Scene[];
  /** YouTube metadata */
  youtube: {
    title: string;
    description: string;
    tags: string[];
  };
};

/**
 * Generate a full cinematic storyboard for a vehicle ad.
 */
export async function generateStoryboard(
  vehicle: VehicleInfo
): Promise<Storyboard> {
  if (!ENV.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const systemPrompt = `你是崑家汽車的影片創意總監兼編劇。你為二手車製作有故事性的 YouTube 廣告影片。

你的影片風格：
- 有真實感的人物角色（買家、家庭、情侶、業務員等）
- 有故事劇情（不只是展示車輛，要有情感）
- 電影級的畫面品質
- 溫暖但專業的氛圍
- 高雄在地感（崑家汽車位於高雄三民區）

你需要產出一個完整的分鏡腳本 JSON，包含 **25-35 個場景**，總片長約 **5 分鐘（300 秒）**。

影片結構（五幕劇）：
- 第一幕「引子」(30秒, 3-4場景)：日常生活中的需求/痛點，引起共鳴
- 第二幕「相遇」(60秒, 6-8場景)：主角發現崑家汽車、走進展廳、看到這台車
- 第三幕「體驗」(90秒, 8-10場景)：試駕、感受車輛細節、業務介紹、貸款諮詢
- 第四幕「決定」(60秒, 5-7場景)：交車、感動時刻、開上路
- 第五幕「新生活」(60秒, 5-7場景)：主角用車的美好日常 + 崑家汽車品牌收尾

每個場景需要：
1. imagePrompt: 英文，給 AI 圖像生成器（詳細描述人物外觀、服裝、表情、場景環境、光影、構圖。人物要保持一致性）
2. motionPrompt: 英文，給 AI 影片生成器（描述鏡頭運動：slow pan, dolly in, tracking shot, crane up, close-up, wide establishing shot 等）
3. narration: 繁體中文旁白（溫暖、有感情、口語化，像紀錄片旁白）
4. durationSec: 該場景持續秒數（8-12 秒）

故事類型可以是：
- 年輕人買第一台車的興奮
- 家庭換車帶孩子去旅行
- 創業者需要一台可靠的車
- 情侶假日兜風
- 退休長輩享受生活
- 單親媽媽需要安全接送孩子的車
- 剛出社會的上班族圓夢

重要：人物外觀描述要在所有場景保持一致（同一個人穿同樣的衣服、同樣的髮型）。
請根據車型特性選擇最適合的故事。回覆必須是純 JSON。`;

  const features = vehicle.features?.length
    ? `配備: ${vehicle.features.join(", ")}`
    : "";

  const userPrompt = `為這台車寫一個有劇情的 YouTube 廣告分鏡腳本：

車輛：${vehicle.year} ${vehicle.make} ${vehicle.model}
顏色：${vehicle.color ?? "未指定"}
里程：${vehicle.mileage != null ? `${vehicle.mileage.toLocaleString()} km` : "未指定"}
售價：${vehicle.price != null ? `NT$ ${vehicle.price.toLocaleString()}萬` : "面議"}
${features}

回覆 JSON：
{
  "concept": "故事概念",
  "audience": "目標受眾",
  "musicMood": "音樂情緒",
  "musicPrompt": "English prompt for AI music generation, describe genre/mood/instruments",
  "scenes": [
    {
      "sceneNumber": 1,
      "durationSec": 8,
      "imagePrompt": "A young Taiwanese man in his late 20s...",
      "motionPrompt": "Slow dolly forward...",
      "narration": "有些時刻，你知道一切正在改變...",
      "description": "開場：主角站在崑家汽車展廳前"
    }
  ],
  "youtube": {
    "title": "...",
    "description": "...",
    "tags": ["...", "..."]
  }
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
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error (${response.status}): ${errorText.substring(0, 500)}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };

    const text = data.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("");

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Claude did not return valid storyboard JSON");
    }

    const storyboard = JSON.parse(jsonMatch[0]) as Storyboard;

    // Validate basic structure
    if (!storyboard.scenes?.length) {
      throw new Error("Storyboard has no scenes");
    }

    logger.info("Storyboard", `Generated ${storyboard.scenes.length}-scene storyboard: "${storyboard.concept}"`);
    return storyboard;
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      throw new Error(`Storyboard generation timed out after ${CLAUDE_TIMEOUT_MS}ms`);
    }
    throw err;
  }
}
