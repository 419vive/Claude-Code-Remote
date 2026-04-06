# 崑家汽車 AI 聊天機器人 — Claude Code 配置

## 專案概述

崑家汽車（Kun-Auto）AI 客服聊天機器人，整合 LINE Official Account，提供車輛查詢、預約看車、貸款諮詢等功能。從 8891 同步車輛庫存，具備智慧意圖偵測與潛在客戶評分系統。

## 技術棧

- **前端**：React 19 + TypeScript + Tailwind CSS 4 + Radix UI + wouter (路由) + Tanstack React Query + React Hook Form
- **後端**：Express + tRPC + Node.js (ESM)
- **資料庫**：MySQL + Drizzle ORM
- **AI/LLM**：Google AI (Gemini 2.5 Flash) — 透過 OpenAI-compatible REST endpoint 呼叫
- **訊息平台**：LINE Messaging API（Webhook + Rich Menu + Flex Message）
- **檔案儲存**：AWS S3（`@aws-sdk/client-s3`）
- **網頁爬取**：Cheerio（用於 8891 車輛同步）
- **影片**：Remotion（影片渲染）
- **認證**：Jose（JWT）+ bcrypt
- **建置工具**：Vite 7 + esbuild
- **測試**：Vitest
- **套件管理**：pnpm
- **部署**：Railway / Render + Docker

## 專案結構

```
kun-auto-chatbot/
├── client/src/         # React 前端
│   ├── components/     # UI 元件
│   ├── pages/          # 頁面（26 頁：Home, Chat, Dashboard, LoanInquiry, Appointments...）
│   ├── hooks/          # 自訂 hooks
│   ├── contexts/       # React Context
│   ├── data/           # 靜態資料（blogPosts, serviceAreas）
│   ├── remotion/       # Remotion 影片元件
│   └── lib/            # 工具函式
├── server/             # Express + tRPC 後端
│   ├── _core/          # 核心模組（env, trpc, llm, auth, context）
│   ├── routes/         # 額外路由（admin, leadScoring）
│   └── *.ts            # 功能模組（lineWebhook, sync8891, security...）
├── shared/             # 前後端共用型別與常數
├── drizzle/            # DB schema 與 migration
├── scripts/            # 工具腳本
└── public/             # 靜態資源
```

## 路徑別名

- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

## Build & Test 指令

```bash
# 開發模式
pnpm dev

# 建置
pnpm build

# 測試
pnpm test

# 型別檢查
pnpm check

# 資料庫遷移
pnpm db:push
```

- ALWAYS 在修改程式碼後跑測試 (`pnpm test`)
- ALWAYS 在 commit 前確認建置成功 (`pnpm build`)

## 效率規則：並行操作

- 所有獨立操作 MUST 在同一個 message 內並行執行
- ALWAYS 把所有 file reads/writes/edits 批次放在同一個 message
- ALWAYS 把所有獨立的 Bash 指令批次放在同一個 message
- 使用 `run_in_background: true` 執行背景 agent，不要輪詢狀態 — 等結果回來再處理

## 行為規則

- 做被要求的事，不多不少
- NEVER 建立不必要的檔案 — 優先編輯現有檔案
- NEVER 主動建立 *.md 或 README 檔案（除非明確要求）
- NEVER 把工作檔案或測試存到專案根目錄
- ALWAYS 先讀取檔案再編輯
- NEVER commit .env 或含有密鑰的檔案

## 檔案組織

- 前端程式碼放 `client/src/`
- 後端程式碼放 `server/`
- 共用型別放 `shared/`
- 資料庫相關放 `drizzle/`
- 工具腳本放 `scripts/`
- 測試檔案放在對應模組旁邊（`*.test.ts`）

## 安全規則

- NEVER 在原始碼中硬編碼 API 金鑰、密鑰或憑證
- NEVER commit .env 檔案
- 使用 `server/security.ts` 的函式處理輸入消毒（sanitizeChatMessage, sanitizeSearchQuery）
- 使用 `maskPhone`, `maskName`, `maskPIIInText` 保護個人資料
- 使用 `xss-filters` 防止 XSS 攻擊
- 使用 `helmet` 和 `express-rate-limit` 保護 API

## 環境變數（.env）

定義在 `server/_core/env.ts`：

**必要：**
- `DATABASE_URL` — MySQL 連線字串
- `GOOGLE_AI_API_KEY` — Google AI (Gemini) API 金鑰
- `JWT_SECRET` — Cookie/JWT 簽名密鑰（production 必填）

**LINE 整合：**
- `LINE_CHANNEL_ACCESS_TOKEN` — LINE Channel Access Token
- `LINE_CHANNEL_SECRET` — LINE Channel Secret

**選填（有預設值）：**
- `VITE_APP_ID` — 應用程式 ID（預設 `kun-auto-chatbot`）
- `OAUTH_SERVER_URL` — OAuth 伺服器網址
- `FORGE_API_URL` / `FORGE_API_KEY` — Forge API 整合
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — 管理員帳號密碼

## 核心業務模組

| 模組 | 檔案 | 功能 |
|------|------|------|
| LINE 整合 | `lineWebhook.ts`, `lineUtils.ts`, `lineRichMenu.ts` | LINE 訊息收發、Rich Menu |
| LINE 通知 | `lineNotification.ts`, `lineRecovery.ts` | 推播通知、訊息重試恢復 |
| LINE Flex | `lineFlexTemplates.ts` | Flex Message 豐富訊息模板 |
| 車輛偵測 | `vehicleDetectionService.ts` | 從對話中辨識車輛與客戶意圖 |
| 8891 同步 | `sync8891.ts` | 從 8891 爬取並同步車輛庫存（Cheerio） |
| 潛客評分 | `routers.ts`, `routes/leadScoring.ts` | 8 維度潛在客戶評分模型 |
| LLM 回覆 | `_core/llm.ts`, `dynamicPromptBuilder.ts` | AI 對話產生（Gemini） |
| 規則回覆 | `ruleBasedReply.ts` | 不經 LLM 的快速規則回覆 |
| 語音轉文字 | `_core/voiceTranscription.ts` | 語音訊息轉文字 |
| 圖片生成 | `_core/imageGeneration.ts` | AI 圖片生成 |
| 檔案儲存 | `storage.ts` | AWS S3 檔案上傳與管理 |
| 預約時段 | `timeSlotHelper.ts` | 預約看車時段管理 |
| 追蹤分析 | `trackingApi.ts`, `pixelEventsRelay.ts` | 廣告追蹤與 Pixel 事件轉發 |
| SEO | `seo.ts` | 伺服器端 SEO 渲染 |
| 安全防護 | `security.ts` | 輸入消毒、PII 遮罩、安全事件紀錄 |
| 認證授權 | `_core/adminAuth.ts`, `_core/oauth.ts`, `_core/sdk.ts` | 管理員認證、OAuth 流程 |
| 日誌 | `logger.ts` | 集中式日誌系統 |

## 編碼慣例

- 使用 TypeScript strict mode
- 使用 ESM（`"type": "module"`）
- tRPC router 定義在 `server/routers.ts`，使用 `publicProcedure` / `protectedProcedure` / `adminProcedure`
- 資料庫操作透過 `server/db.ts` 封裝
- 前端路由使用 wouter
- UI 元件使用 Radix UI + Tailwind CSS
- 使用 Zod 做輸入驗證
- 保持檔案在 500 行以內
