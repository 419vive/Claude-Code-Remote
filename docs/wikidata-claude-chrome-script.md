# 崑家汽車 Wikidata Entity 建立 — Claude in Chrome 自動化腳本

> 這份文件是給 **Claude in Chrome 瀏覽器擴充功能**用的 step-by-step 指令。
> 開啟 Claude in Chrome → 把整份文件貼給 Claude → 讓它幫你執行每一步。
> 如果中途需要登入 Wikidata，Claude 會停下來請你手動完成（它不能幫你打密碼）。

---

## 給 Claude in Chrome 的指令

幫我建立一個崑家汽車的 Wikidata entity。請一步步執行下列操作，每一步完成後給我看結果再繼續。如果遇到登入頁面，停下來提醒我手動登入。

---

### 步驟 0：確認登入

1. 開新分頁進入 https://www.wikidata.org
2. 看右上角，如果顯示「登入」（log in）→ 提醒我登入。如果已經是我的帳號名稱 → 繼續。
3. **如果我沒帳號**：請點「建立新帳號」並暫停，等我填完帳號密碼。

---

### 步驟 1：開新建項目頁面

進入：https://www.wikidata.org/wiki/Special:NewItem

---

### 步驟 2：填寫基本資訊

在頁面上的表單，填入以下三個欄位：

| 欄位 | 值 |
|---|---|
| Language（語言） | `zh-tw` |
| Label（標籤） | `崑家汽車` |
| Description（描述） | `高雄市三民區的二手車商，1986年創立，由賴崑家經營` |
| Aliases（別名）— 點 add 多個 | `KUN MOTORS`、`崑家中古車` |

填完後按底部的 **「Create」（建立）** 按鈕。

---

### 步驟 3：等頁面跳轉，記下 Q-number

頁面會跳到新建好的 entity 頁，URL 會是 `https://www.wikidata.org/wiki/Q12345678` 之類。

**把那個 Q 編號（例如 Q12345678）記下來告訴我**——這是最終要回填到我的網站 schema 裡的關鍵資訊。

---

### 步驟 4：依序加入下列 statements（陳述句）

每一個 statement 都點頁面上的 **「+ Add statement」** 按鈕，然後在「Property」欄打 property 名稱（會自動跳出建議），在「Value」欄打值。

加完每一個按 **「publish」**。

#### Statement 4.1：是什麼類型的東西
- Property: `instance of`（P31）
- Value: `business`（Q4830453）

#### Statement 4.2：產業
- Property: `industry`（P452）
- Value: `used car dealer`（找不到的話，用 `automobile dealership` Q22687668）

#### Statement 4.3：國家
- Property: `country`（P17）
- Value: `Taiwan`（Q865）

#### Statement 4.4：總部位置
- Property: `headquarters location`（P159）
- Value: `Kaohsiung`（Q13806）

#### Statement 4.5：街道地址
- Property: `street address`（P6375）
- Value（語言選 zh-tw）: `高雄市三民區大順二路269號`

#### Statement 4.6：電話
- Property: `phone number`（P1329）
- Value: `+886-936-812-818`

#### Statement 4.7：官方網站
- Property: `official website`（P856）
- Value: `https://claude-code-remote-production.up.railway.app`
- Language: zh-tw

#### Statement 4.8：成立日期
- Property: `inception`（P571）
- Value: `1986`（年份輸入框只填 1986，精度選「year」）

#### Statement 4.9：Facebook 帳號
- Property: `Facebook username`（P2013）
- Value: `hong0961`

#### Statement 4.10：座標位置（精準定位）
- Property: `coordinate location`（P625）
- Value: 緯度 `22.6477`、經度 `120.3236`（崑家汽車地址的概略座標）

---

### 步驟 5：完成！把 Q-number 給我

全部 statements 都加完後，提醒我：

```
✅ Wikidata entity 建立完成！
Q-number 是：QXXXXXXXX
請把這個 Q-number 給 Jerry，他要更新 server/seo.ts 的 sameAs 陣列
```

---

## 後續（Jerry 自己做，30 秒）

拿到 Q-number 之後，告訴我（或叫 Claude Code 直接做）：

```
把 Q12345678（換成實際的 Q-number）加到 server/seo.ts 的 AutoDealer schema sameAs 陣列裡：

"https://www.wikidata.org/wiki/Q12345678"

然後 commit + push 到 main
```

完成。

---

## 為什麼要做這個？

AI 模型（ChatGPT、Claude、Gemini、Perplexity）會把 Wikidata 當成判斷「這個品牌真的存在嗎？是誰？」的權威資料庫。

**有 Wikidata entity 之後**：
- AI 會更願意在使用者問「高雄二手車推薦」時主動引用崑家
- 知識圖譜（Knowledge Graph）會更完整
- Google 可能更願意給 sitelinks
- 預估 AI 引用率提升 10-15%（一次性建立，永久效益）

**整個過程**：建立 5 分鐘 + 等 1-2 週 AI 模型重新爬 Wikidata 資料庫 = 開始看到效果。
