# 崑家汽車 — SEO Content Loop｜Claude Code Handoff

> 目的：把「長尾關鍵字 → 自動寫 blog → 上線 → 驗證 → 學習」這個 SEO loop 交接到 **Claude Code** 上運行。
> 用法：把這份文件放進 repo（建議 `docs/SEO_LOOP.md`），並在 Claude Code 開場時貼上「§9 開場指令」。

---

## 1. 專案背景

- **業務**：崑家汽車 KUN MOTORS，高雄三民區大順二路269號，40 年在地二手車行。
- **正式站**：https://claude-code-remote-production.up.railway.app （railway.app 就是正式站，非自訂網域）
- **Repo**：`419vive/kunjia-autos-ai-chatbot`，root 目錄 `kun-auto-chatbot`
- **部署**：push 到 main → Railway 自動重新部署上線。
- **SEO 現況（2026-07-15 稽核）**：meta / OG / canonical / robots / JSON-LD 全部已到位並通過 Google Rich Results Test；Google 已開始索引。sitemap 與 llms.txt 由 `server/seo.ts` 動態產生，新文章會自動被收錄。

> ⚠️ **2026-07-15 執行首篇時發現的落差**：實際檢查 `server/seo.ts` 後確認，sitemap.xml 與逐篇 meta/JSON-LD（`blogMeta` 物件）其實是**手寫的靜態清單**，並沒有動態讀取 `blogPosts.ts`。目前 `blogPosts.ts` 已有 47 篇文章，但 sitemap 只列出 6 篇、`blogMeta` 只涵蓋 12 篇——包含這次新增的 Altis 這篇在內，其餘約 35 篇都不在 sitemap 裡，可能沒有被 Google 完整收錄。這會直接影響 §3 的 VERIFY 步驟（GSC 排名/曝光要看得到，文章要先被索引）。建議另開一個「SEO 基礎設施」任務，把 `server/seo.ts` 改成動態讀取 `blogPosts.ts` 產生 sitemap 與 meta，而不是每篇手動維護清單。本次任務範圍不動 `server/seo.ts`，僅記錄於此供下次處理。

## 2. 部落格內容存在哪（重要）

- 文章資料檔：**`client/src/data/blogPosts.ts`**（不是 `lib/`，實際路徑已更新；目前 47 篇）。
- 路由與 SEO：`BlogPost.tsx` 顯示、`server/seo.ts` 產生 meta / JSON-LD（BlogPosting + FAQPage）/ sitemap（見上方落差說明）。
- **每寫一篇 = 在 `blogPosts.ts` 新增一個條目並 commit。** 動作前先讀現有條目，**完全比照現有 schema**（欄位名、slug 格式、日期格式、FAQ 結構都照舊），不要自創欄位。

## 3. 目標與迴圈邏輯（objective metric = Google 排名）

每篇文章都必須走這個 loop：

1. **BUILD / WRITE** — 鎖定**一個**長尾關鍵字，寫一篇做好 on-page 的完整文章（見 §5）。
2. **VERIFY** — 上線後用 Google Search Console 看該關鍵字的 impressions / 平均排名 / 點擊。
3. **LEARN** — 依數據回頭調整（見 §6 規則），再進下一篇。
4. 持續數月，重點是**累積**，不是單篇爆紅。

> 為什麼主攻長尾：`高雄二手車`、`中古車推薦` 被 SUM/8891/abccar 壟斷，新站短期打不贏。長尾競爭低、意圖強、成交率高。

## 4. 關鍵字佇列（依 Google Keyword Planner 真實月搜尋量排序，台灣繁中，2026-07-15 實查）

一次寫一個，寫完打勾。競爭度與趨勢為 KWP 精確值；量為區間。

| # | 目標關鍵字 | 月搜尋量 | 競爭 | 建議標題 | 狀態 |
|---|---|---|---|---|---|
| 1 | Altis 二手 / toyota altis 二手 | **1K–10K** | 中 | 二手 Altis 買哪一代最划算？通病、殘值、年份行情 | ✅ 2026-07-15（`used-altis-which-generation`，PR 待審） |
| 2 | 泡水車 怎麼看 | 100–1K（**+900%🔥**）| 低 | 泡水車怎麼看？5 個 30 秒自檢重點 | ☐ |
| 3 | 中古車貸款陷阱 | 100–1K | **低** | 中古車貸款 6 大陷阱與避開方法 | ☐ |
| 4 | 二手車貸利率 / 頭期款 | 100–1K | 低 | 二手車貸款利率與頭期款全解析 | ☐ |
| 5 | 二手 CR-V / Vios / Sentra（依實際庫存挑）| 1K 級車款 | 中 | 二手 [車款] 值得買嗎？世代差異與通病 | ☐ |
| 6 | 事故車 怎麼分辨 | 100–1K | 低 | 事故車判斷懶人包：鈑金、色差、縫隙 | ☐ |
| 7 | 二手車里程數 造假 / 調表 | 中 | 低 | 二手車里程數造假怎麼抓？調表車 4 破綻 | ☐ |
| 8 | 中古車保固 五大保固 | 10–100 | 低 | 中古車五大保固到底保什麼？引擎變速箱保多久 | ☐ |
| 9 | 三民區二手車 / 大順路中古車 | Local | 低 | 三民區買二手車就找崑家（大順二路）落地頁 | ☐ |
| 10 | 高雄 二手車 30萬 推薦 | 100–1K | 中 | 30 萬在高雄能買什麼二手車？5 款高 CP | ☐ |

**佇列用完後**：用「車款 × 年份 × 在地」「預算 × 車型」「保養/過戶/驗車 × 具體問題」組合產新題，但每次都先確認該題有真實搜尋需求（可再跑 KWP 或看 GSC 的 query 報告找新字）。

## 5. On-Page 檢查表（每篇必做）

- [ ] 標題（H1 + `<title>`）含目標長尾關鍵字，用問句或數字型
- [ ] meta description 120 字內、含關鍵字、寫出「點進來能得到什麼」
- [ ] slug 用英文短語（例：`used-car-loan-traps`）
- [ ] 前 100 字就給答案（搶精選摘要 & AI 引用）
- [ ] H2/H3 分段；至少一個**比較表格**（LLM 與 Google 都偏好表格）
- [ ] **FAQ 區塊** 3–5 題（對應現有 FAQPage schema）
- [ ] 內部連結：連 2–3 篇相關舊文 + 相關庫存車頁 + FAQ
- [ ] 文末 CTA：LINE @825oftez / 電話 0936-812-818
- [ ] 一篇只鎖**一個**主關鍵字，避免自我competition
- [ ] 沿用 `server/seo.ts` 既有 JSON-LD（勿重寫）

## 6. Learn 規則（每次 verify 後照做）

- 關鍵字排到 **5–15 名** → **加強那篇**（補內容、加內部連結、換更精準標題），最划算，通常小改進前 3。
- **0 impressions** → 主題太競爭或偏了，換題。
- 有 impressions **但沒點擊** → 改 title / meta description。
- 新文 **2–4 週**沒被索引 → 在 GSC 手動要求索引 + 檢查 sitemap。

## 7. 節奏與模型分工

- **節奏：每週 2–3 篇**（品質 > 數量；每天一篇 Google 可能視為灌水）。
- **寫文（build/write）→ Sonnet**：品質成本平衡，跑主力產文。
- **策略 / learn（每週一次）→ Opus**：看 GSC 整體數據，決定下批主題、判斷哪些文加強或砍。
- **輕量監測 → Haiku**：併進現有每週 GEO 稽核排程（索引數、排名變化）。

## 8. Guardrails（重要）

- **前 3–5 篇先讓 419vive 過目**再全自動，建立品質信任。
- **車況/車價/年份等事實不得杜撰**；不確定就寫通則或標註「以實車為準，請洽門市」。
- 品牌語氣：專業、在地、實在（40 年老店、實車實價、第三方認證、保證里程）。
- commit message 用清楚格式，例：`blog: add 二手Altis買哪一代 (SEO longtail #1)`。
- 建議走 **PR → 自己 merge**（前期）；穩定後再直接 push main。
- 不要一次改動 `blogPosts.ts` 以外的檔案（除非 learn 需要調 SEO 設定，且先說明）。

## 9. Claude Code 開場指令（直接複製貼上）

在 Claude Code 連好 `419vive/kunjia-autos-ai-chatbot` 後，貼這段：

```
讀 docs/SEO_LOOP.md。你要執行崑家汽車的 SEO 內容 loop。

這次任務：
1. 讀 client/src/lib/blogPosts.ts，理解現有文章的 schema 與風格。
2. 從 SEO_LOOP.md §4 佇列取第一個未完成的關鍵字（目前是「二手 Altis 買哪一代」）。
3. 依 §5 On-Page 檢查表寫一篇完整繁中文章，格式完全比照 blogPosts.ts 現有條目。
4. 以 PR 形式提交（分支 seo/altis-generation-guide），commit message 照 §8 格式。
5. 在 PR 描述裡列出：目標關鍵字、月搜尋量、這篇要搶的排名位置、之後要在 GSC 追蹤什麼。
6. 把 §4 佇列該列狀態改成完成。

規則：一篇只鎖一個關鍵字；車況事實不得杜撰；寫完停下讓我 review，先不要自動 merge。
```

之後每次要新文章，只要說「跑下一篇 SEO loop」，它就會接著佇列往下做。每週再單獨用 Opus 說「跑本週 SEO learn 回顧」看數據調方向。

## 10. 設定步驟（在 Claude Code 端）

1. 開 Claude Code，連接 GitHub、選 `419vive/kunjia-autos-ai-chatbot` repo。
2. 把本文件存成 `docs/SEO_LOOP.md` 並 commit（讓它成為 repo 內的標準流程）。
3. 貼 §9 開場指令，跑第一篇、review、merge → Railway 自動上線。
4. 上線後 2–4 週在 GSC 看該關鍵字表現，回到 Claude Code 說「跑 SEO learn」。
5. 穩定信任後，可把節奏設成每週 2–3 篇的排程，並允許直接 push。

---
*交接自 Cowork GEO 稽核工作階段，2026-07-15。關鍵字量體為 Google Keyword Planner 實查（台灣繁中）。*
*2026-07-15 執行首篇時更新：實際檔案路徑為 `client/src/data/blogPosts.ts`（非 `lib/`）；sitemap/meta 落差記錄於 §1。*
