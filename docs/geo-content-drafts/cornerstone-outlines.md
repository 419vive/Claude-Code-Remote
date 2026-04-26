# Six New Cornerstone Content Outlines — 2026 GEO Push

**Drafted:** 2026-04-26 (overnight session)
**For:** Jerry's review and approval before any writing/publishing
**Goal:** Fill gaps in the existing 6 cornerstone posts, target uncovered search intent for "高雄二手車" and adjacent queries.

---

## Why these 6, and why these orders?

**Existing cornerstone library** (already published, do not duplicate):
1. `/blog/buy-used-car-guide` — buying basics (注意事項)
2. `/blog/used-car-loan-guide` — loan deep-dive
3. `/blog/kaohsiung-used-car-guide` — Kaohsiung market overview
4. `/blog/third-party-inspection-guide` — certification deep-dive
5. `/blog/used-car-transfer-guide` — title transfer process
6. `/blog/kaohsiung-used-car-dealers-comparison` — dealer comparison

**Gaps these 6 new pieces fill:**
- ❌ No quarterly **market data report** → captures "行情" / "今年價格" queries (high freshness signal value)
- ❌ No **long-form pillar** that internally links all the others → SEO hub
- ❌ Zero **English-language** surface → expat segment + zero competition
- ❌ No **新車 vs 二手** comparison → captures massive intent volume
- ❌ No **specific-model comparisons** → captures long-tail brand queries
- ❌ No **personal-brand storytelling** → builds trust and shareability

---

## Cornerstone #1: 「2026 年高雄二手車市場行情完整報告」

**Target queries:**
- 高雄二手車行情 / 高雄二手車市場 / 高雄中古車價格 2026
- 二手車現在好買嗎 / 2026 中古車降價 / 二手車市場分析

**Why this angle:** Search intent for "行情" is buyer-research mode (high purchase probability). No 高雄 dealer publishes market data. Quarterly refresh = freshness signal, signals expertise (E-E-A-T).

**Suggested structure (~2,500 words):**
1. **本季 (Q1/Q2 2026) 高雄二手車市場概況** — 1 paragraph trend statement
2. **熱門車種行情速查表** — table format:
   - Toyota Altis 2018-2020 — 高雄價格區間 vs 全台均價
   - Honda CR-V 2019-2021 — 同上
   - Mazda CX-5 2018-2020
   - BMW 3系 2018-2020
   - Benz C-Class 2018-2020
   - Nissan Tiida 2017-2020
   - Toyota Camry 2018-2020
   - Toyota RAV4 2019-2021
3. **高雄 vs 台北 vs 台中 二手車價格差距分析** (data-driven section)
4. **本季影響行情的 3 大因素** (e.g., 新車交期、油價、租賃車回流)
5. **Q3-Q4 高雄二手車市場預測**
6. **崑家汽車本月精選庫存推薦**（內鏈到 `/`）

**Data source:** Jerry's actual transaction records + 8891.tw market data + 交通部公路監理總局 official statistics

**Schema markup needed:** Article + Dataset (for the table)

**Internal links:** ALL 5 existing cornerstones + homepage + relevant brand pages

**Refresh cadence:** Quarterly (Mar / Jun / Sep / Dec)

---

## Cornerstone #2: 「高雄二手車買賣全攻略：從預算規劃到交車」

**Target queries:**
- 高雄二手車怎麼買 / 高雄買中古車流程 / 第一次買二手車要怎麼開始
- 高雄二手車入門 / 二手車購買流程

**Why this angle:** This is the **PILLAR PAGE** — the long-form hub that internally links all 5 existing cornerstones. Pillar pages dominate ranking by accumulating link equity from satellites.

**Suggested structure (~3,500-4,000 words):**
1. **第一步：搞清楚自己的需求和預算** (~400 words, link to `/price/under-30`, `/price/30-50`, etc.)
2. **第二步：選車品牌與車型** (~500 words, link to `/brand/Toyota`, `/brand/Honda`, etc.)
3. **第三步：找對的車行** (~400 words, link to `/blog/kaohsiung-used-car-dealers-comparison`)
4. **第四步：看車與檢查** (~500 words, link to `/blog/buy-used-car-guide` + `/blog/third-party-inspection-guide`)
5. **第五步：議價與簽約** (~400 words, NEW content on negotiation tactics)
6. **第六步：貸款規劃** (~400 words, link to `/blog/used-car-loan-guide`)
7. **第七步：過戶與交車** (~400 words, link to `/blog/used-car-transfer-guide`)
8. **第八步：交車後保固與保養** (~400 words, NEW content)
9. **常見錯誤 7 大警示** (NEW content, generates FAQPage entries)
10. **崑家汽車購車流程：從聯繫到交車的完整時間軸**（內鏈到 `/book-visit`）

**Schema markup needed:** Article + HowTo (for the 8 steps) + FAQPage (for the 7 warnings)

**Why pillar-page format:** Google increasingly weights "comprehensive guides" higher than narrow blog posts. This page becomes the canonical answer to "I want to buy a used car in Kaohsiung — what do I do?"

---

## Cornerstone #3: 「高雄外國人買二手車指南 (Foreigner's Guide to Used Cars in Kaohsiung)」

**Target queries (English):**
- buy used car kaohsiung / kaohsiung used cars english / foreigner buy car taiwan
- best used car dealer kaohsiung / second-hand car kaohsiung

**Target queries (Chinese):**
- 外國人在高雄買車 / 外籍人士買車 / ARC 買車

**Why this angle:** **Zero competition.** Most Taiwanese dealers don't publish English content. Kaohsiung has 15,000+ English-speaking expats (teachers, engineers, business). Even capturing 1% of expat used-car purchases = 5-10 cars/year of incremental revenue. Plus: English content gets **dramatically more AI citations** because LLM training data is English-heavy.

**Suggested structure (~2,000 words, fully bilingual):**
1. **Why buy used in Kaohsiung?** (price comparison vs. new, vs. Taipei)
2. **Documents you need as a foreigner** (ARC, driver's license conversion, tax requirements)
3. **The buying process in plain English** (step-by-step, what to expect)
4. **What "third-party inspection" actually means** (and why it matters more than dealer warranty)
5. **Financing options for foreigners** (which banks accept ARC, what rates to expect)
6. **Title transfer for non-citizens** (the bureaucratic process, what dealers handle vs. what you handle)
7. **Why Kunjia Autos works for foreigners specifically** (English-able staff via LINE+translation, written contracts, transparent pricing)
8. **Contact us in English** — direct LINE link, simplified form

**Schema markup:** Article + FAQPage + Service (with `inLanguage: ["zh-TW", "en"]`)

**Critical:** Add `<link rel="alternate" hreflang="en">` properly. Path could be `/en/used-cars-kaohsiung` or `/used-cars-kaohsiung-english`.

**Note:** Translation should be done by a real bilingual person (NOT machine translation), or at minimum proofread by one. Bad English on a "guide for foreigners" page is worse than no page at all.

---

## Cornerstone #4: 「高雄買新車還是二手車？5 個真實情境分析」

**Target queries:**
- 新車 vs 二手車 / 該買新車還是二手 / 二手車比新車划算嗎
- 中古車優缺點 / 二手車值得買嗎

**Why this angle:** This is the **objection-handling pillar.** Every used-car buyer has the "should I just save up for a new car" thought. Owning the SERP for "新車 vs 二手車" captures intent BEFORE buyers commit to a path.

**Suggested structure (~2,500 words):**
1. **金錢面：5 年總持有成本對比** (data table: 同款新車 vs 同款 3-year-old 二手 — 折舊、稅、保險、保養)
2. **情境 1：剛出社會新鮮人 (預算 30-50萬)**
3. **情境 2：30 多歲首購家庭 (預算 60-90萬)**
4. **情境 3：第二台車 / 通勤車 (預算 30萬以下)**
5. **情境 4：豪華車買家 (預算 100萬以上)**
6. **情境 5：商用 / 自雇者 (稅務考量)**
7. **甚麼時候買新車比較合理？** (誠實節：避免「賣方包裝」感)
8. **甚麼時候買二手車比較合理？**
9. **崑家汽車的二手車為什麼能讓人安心** (third-party 認證 + 透明定價)

**Schema markup:** Article + ComparisonTable (custom structured data)

**Why "誠實節" matters:** Including a section honestly recommending new car for some scenarios *increases trust* and ranks higher because it signals expertise (E-E-A-T) over salesmanship.

---

## Cornerstone #5: 「Toyota Altis、Honda Civic、Nissan Tiida：高雄三大平民神車二手價比較 2026」

**Target queries:**
- Altis 二手 / Civic 二手 / Tiida 二手
- 高雄 Altis / 高雄 Civic
- 平民車 推薦 / 油電車 二手

**Why this angle:** Long-tail brand+model+location queries are **lower competition + higher purchase intent**. These three models are 高雄's dominant secondary-market vehicles. Owning the comparison post for these three captures all 9 individual model queries by reflection.

**Suggested structure (~2,000 words):**
1. **這三台為什麼是高雄街頭最常見的二手車？** (background, sales data)
2. **Toyota Altis (2018-2022)**:
   - 高雄當前行情區間
   - 主要優點 / 缺點
   - 認證重點檢查項
   - 適合誰買
3. **Honda Civic (2018-2022)**: 同上
4. **Nissan Tiida (2017-2020)**: 同上
5. **三車對比表**: 油耗、保養成本、保值率、改裝彈性、零件取得性
6. **如果是我，我會選哪一台？** (personal recommendation by use case)
7. **本月崑家汽車這三款庫存** (dynamic, internal links)

**Schema markup:** Article + ProductGroup + Vehicle (×3) + ComparisonTable

**Replicable framework:** This template can be repeated quarterly with different model groupings:
- "BMW 3 系 vs Benz C-Class vs Audi A4：高雄豪華入門款比較"
- "Toyota RAV4 vs Honda CR-V vs Mazda CX-5：高雄家庭休旅選哪台"
- "Toyota Sienta vs Honda Odyssey vs Nissan Serena：高雄 7 座 MPV 二手車"

Each ranks for its specific 3-model trio = 9-12 long-tail keywords per post.

---

## Cornerstone #6: 「我爸要我幫他選第一台車：一個 70 歲老闆的新手買車清單」

**Target queries:**
- 新手買車 / 第一次買車 / 第一台車
- 給長輩的車 / 老人買車 / 銀髮族買車
- 買車不知道怎麼選

**Why this angle:** This is the **personal-brand pillar.** It's also the **earned-media-bait pillar** — the kind of human-interest story that 商業周刊, 數位時代, 高雄 Lifestyle YouTubers can quote. Telling Jerry's father's actual story (70 years old, runs business via phone, AI bot helps customers, 40-year shop history) makes the brand *unforgettable*.

**Suggested structure (~2,500-3,000 words, first-person voice):**
1. **「賴老闆，您 70 歲了還在賣車？」** (lead anecdote — opening hook)
2. **40 年前我們開店時，這條路上還是稻田**(brand history mini-bio)
3. **我兒子設計的 AI 客服，比我們手寫的紀錄還詳細** (your AI bot story, humanized)
4. **新手買車最常踩的 5 個雷區** (educational core)
5. **新手買車前一定要做的 7 件事** (actionable checklist)
6. **新手最適合的 5 種二手車類型** (with specific recommendations)
7. **買車當天的 3 步流程，老闆親自帶你走一遍** (transparency)
8. **我為什麼還在做這行？** (closing: family business values, succession)
9. **如果您今天想買第一台車，可以這樣聯絡我們** (soft CTA)

**Schema markup:** Article + Person (Jerry's father as author) + Organization (崑家汽車) + LocalBusiness

**Distribution play:** This is the article you pitch to:
- 商業周刊 (家族企業傳承 angle)
- 數位時代 (傳統業 + AI 結合 angle)
- 報導者 / The Reporter (老店傳承 angle)
- 高雄在地 YouTubers
- 高雄市政府觀光局 (local-business storytelling content)

**Honesty requirement:** Must be *actually true*. AI cannot make this up — Jerry's father has to actually agree to the angles, the quotes, the lessons. Authenticity is what makes this work.

---

## Publication cadence (suggested)

| Month | Cornerstone | Effort | Distribution |
|---|---|---|---|
| Month 1 | #2 (Pillar — full buying guide) | 12-16 hrs writing + editing | Internal links from existing 5 — immediate |
| Month 2 | #5 (3 平民神車 comparison) | 8-10 hrs | Includes inventory cross-link |
| Month 3 | #1 (Q-report) | 6-8 hrs (recurring quarterly) | Press release angle — pitch to 自由時報財經 |
| Month 4 | #4 (新車 vs 二手) | 8-10 hrs | Reddit r/Taiwan, Dcard, FB groups |
| Month 5 | #6 (personal-brand) | 10-12 hrs (interview-driven) | Earned-media pitch campaign |
| Month 6 | #3 (English bilingual) | 12-15 hrs (translation cost) | Expat FB groups, Forumosa, Reddit r/taiwan |

**Total writing investment:** ~60-80 hours over 6 months. Achievable as 1 weekend per month.

---

## Schema markup checklist (every cornerstone needs)

- [ ] `Article` schema with `@author` (specific person, not just brand), `datePublished`, `dateModified`
- [ ] `BreadcrumbList`
- [ ] `FAQPage` (extract any Q&A pairs from the article)
- [ ] `Speakable` markup (for voice search)
- [ ] Inner-page table of contents with anchor links
- [ ] Featured image with descriptive alt text including target keyword
- [ ] Open Graph image (1200×630, optimized)
- [ ] Internal links to ≥3 existing cornerstones
- [ ] Internal links to homepage with anchor "高雄二手車" or "高雄中古車"
- [ ] CTA to `/book-visit` or LINE OA at the end
- [ ] Updated `last_modified` whenever content changes (schema regeneration)

---

## What NOT to do

❌ **Don't AI-generate these.** Each one needs Jerry's voice, real data, real customer stories. AI-generated cornerstone content is detectable and Google increasingly de-ranks it.

❌ **Don't publish all 6 in one month.** Spreads thin, reads as content farming, dilutes link equity.

❌ **Don't write them in English first then translate.** Cornerstone #3 is the only English one — others should be Chinese-first.

❌ **Don't pitch all 6 to media at once.** #6 is the earned-media pitch. Others are SEO-only.

---

**End of cornerstone outlines. Jerry: please review angles, mark which feel right, suggest changes. Once approved, we can spec out month-1's pillar in detail.**
