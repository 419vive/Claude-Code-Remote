# Kunjia Podcast Studio — 從腳本到 MP4 的一條龍流程

本系統產出 YouTube-ready 的崑家汽車 podcast 影片。所有資產由既有的
Remotion 引擎 + Gemini API + VideoDB 組合而成,不是另一套。

## 系統圖

```
script.json (腳本)                        vehicles DB (8891 在庫車)
     │                                         │
     ▼                                         ▼
generate_voices.py                    pickFeaturedVehicle()
(Gemini 2.5 TTS)                      (挑最貴 available)
     │                                         │
     ▼                                         │
voices/NNN-kai.wav ...                         │
voices/timing.json                             │
     │                                         │
     ▼                                         │
ffmpeg concat (+ gaps)                         │
     │                                         │
     ▼                                         ▼
master.wav  ─────────────┐      ┌── featuredVehicle.photoUrls
                          ▼      ▼
               render-podcast.ts (Remotion)
                          │
                          ▼
                 output/podcast/ep01.mp4
                          │
                          ▼
          (可選) 上傳 VideoDB → 轉錄 + 索引
```

## 快速開始 (EP01 路怒心理學)

```bash
# 0. 一次性前置
pip install google-genai soundfile
brew install ffmpeg            # or: apt install ffmpeg

# 必要環境變數 (.env)
export GEMINI_API_KEY=...      # 已有
export VIDEO_DB_API_KEY=...    # 已有 (optional,上傳成品時才用)

# 1. 開 dev server (給 render 拿車資料)
cd kun-auto-chatbot
npm run dev                    # 另開一個 terminal

# 2. (選配但推薦) 生寫實主持人肖像
python scripts/podcast/generate_portraits.py ep01-road-rage
# → 輸出到 public/podcast/portraits/kai.png + wen.png
# → 然後手動把 script.json 的 hosts.kai.portraitUrl 填上 "/podcast/portraits/kai.png"

# 3. 生配音 (Gemini 2.5 TTS 多人)
python scripts/podcast/generate_voices.py ep01-road-rage
# → 輸出到 scripts/podcast/episodes/ep01-road-rage/voices/
# → 每行一個 WAV + timing.json

# 4. 渲染成品 MP4
npx tsx scripts/podcast/render-podcast.ts ep01-road-rage
# → 輸出到 output/podcast/ep01-road-rage.mp4
```

## 成本估算 (一支 5 分鐘 podcast)

| 項目 | 用量 | 單價 (2026年) | 金額 |
|---|---|---|---|
| Gemini 2.5 Flash TTS | ~4,000 字 | $0.50/1M input + $10/1M output | ~$2.50 USD |
| Gemini 2.5 Flash Image (肖像 x2) | 2 張 | $0.039/張 | ~$0.08 USD |
| VideoDB 儲存 | 1 支 | 免費 tier (50 支) | $0 |
| **總計** | | | **~$2.60 USD (NT$80)** |

比外包剪輯便宜 1000 倍,比全 AI 影片生成便宜 30 倍。

## 規格

| 屬性 | 值 |
|---|---|
| 解析度 | 1920 × 1080 (16:9 YouTube) |
| 幀率 | 30 fps |
| 編碼 | H.264 (via ffmpeg) |
| 音訊 | 44.1 kHz 混合 (24 kHz Gemini 原始 → 升頻) |
| 字型 | Noto Sans TC |
| 品牌色 | `#C4A265` 金 + `#0a0a0a` 黑 |
| 長度 | 由 TTS 真實時長決定 (不硬編碼) |

## 加新一集

```bash
# 1. 複製範本
cp -r scripts/podcast/episodes/ep01-road-rage scripts/podcast/episodes/ep02-xxx

# 2. 編輯 script.json
#    - 改 episodeId, title, subtitle
#    - 改 chapters[].lines (保持 speaker: kai/wen 結構)
#    - 其他區塊 (hosts, cta, musicCue) 通常不動,全集統一

# 3. 執行一樣三步
python scripts/podcast/generate_voices.py ep02-xxx
npx tsx scripts/podcast/render-podcast.ts ep02-xxx
```

## 下集要做的升級 (排 backlog)

1. **Whisper 逐字時間戳** — 目前字幕以「整句」切換,升級後可以 karaoke 字字亮
2. **主持人 talking-head 動嘴** — D-ID/HeyGen API,讓肖像嘴巴同步動
3. **AI 生成 b-roll** — 台灣街景、按喇叭的實景插圖,用 Veo/Kling API
4. **自動上 YouTube + 生縮圖** — Google Data API + Gemini image gen 一鍵流
5. **VideoDB 自動上傳 + 語意搜尋** — 讓 chatbot 回答「有哪集聊過 XX」

## 品質檢查 checkpoints (渲染前)

- [ ] script.json JSON 有效 (無語法錯誤)
- [ ] timing.json `totalDurationMs` 介於 270,000 - 330,000 ms (4.5-5.5 分鐘)
- [ ] voices/*.wav 每個都有檔案且大小 > 10 KB
- [ ] 每行字幕不超過 60 字 (視覺擁擠上限)
- [ ] CTA 資料 (電話、地址) 跟生產環境一致
- [ ] 若有引用「最貴車」,dev server 能回傳 vehicle.list

## 跟既有系統的關係

| 資產 | 既有還是新增 | 備註 |
|---|---|---|
| Remotion 引擎 (`client/src/remotion/`) | **既有** | Vehicle 兩個模板的同一引擎 |
| `KUNJIA_BRAND` 常數 (`types.ts`) | **既有** | 共用色票,podcast 不另創 |
| `public/audio/bgm-upbeat.mp3` | **既有** | 當 podcast 背景音樂 |
| `@remotion/bundler` + `@remotion/renderer` | **既有** | 跟 `render-vehicle-cards.ts` 同模式 |
| Gemini API 呼叫 | **既有** | 跟 `.claude/skills/design/scripts/*/generate.py` 同套 |
| VideoDB | **既有** | `scripts/videodb/` 已經有 SDK |
| `PodcastRoadRage.tsx` composition | **新增** | 第一個 podcast 模板 |
| `scripts/podcast/*` pipeline | **新增** | TTS + ffmpeg + 渲染 orchestrator |

## 故障排除

| 症狀 | 原因 | 修正 |
|---|---|---|
| `GEMINI_API_KEY not set` | 環境變數沒載入 | `source .env` 或用 `dotenv-cli` |
| `ffmpeg: command not found` | 沒裝 ffmpeg | `brew install ffmpeg` |
| `anullsrc ... invalid argument` | ffmpeg 版本太舊 | 升到 ≥ 5.0 |
| Remotion render 卡在 0% | bundler 找不到字體 | 檢查 `client/public/fonts/` |
| 主持人嘴動不對嘴 | 目前不支援 lipsync | 用靜態肖像 (EP01 做法),或上 D-ID |
| 字幕位置擋到肖像 | 行太長 | 編輯 script.json 把該行拆兩行 |
| TTS 語氣生硬 | flash 模型較平 | `--model gemini-2.5-pro-preview-tts` (貴 5x) |

## 安全與合規

- **不放客戶 PII 進 script.json** — 腳本會 commit,未簽核的真人故事不要用真名
- **CTA 的價錢、地址、電話必須跟生產環境同步** — 避免廣告不實
- **「最貴車」是動態挑選的** — 影片成片後,那台車若賣掉,考慮換片或重渲
- **TTS 音色會隨 Gemini 模型更新變化** — 跨集保持一致需要固定 model 版本
