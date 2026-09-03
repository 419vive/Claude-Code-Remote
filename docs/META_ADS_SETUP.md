# Meta Marketing API 設定步驟

程式碼在 `kun-auto-chatbot/server/metaAds.ts`。這份文件只講「拿到 token 之前」要點的東西。

## 誰做什麼

| # | 誰 | 動作 | 在哪 |
|---|---|---|---|
| 1 | 媽媽 | 建立商業檔案（用她自己的帳號、她自己的裝置） | business.facebook.com |
| 2 | 媽媽 | 把粉專、廣告帳號、Pixel `936259169015798` 加進商業檔案 | 商業管理工具 → 帳號 |
| 3 | 媽媽 | 廣告帳號綁**店裡的**付款方式（不是 Jerry 個人的卡） | 帳單設定 |
| 4 | 媽媽 | 把 Jerry 加為使用者 → 指派廣告帳號「廣告主」權限 | 設定 → 使用者 |
| 5 | Jerry | 建立應用程式，類型「企業」，擁有者設為上面的商業檔案 | developers.facebook.com |
| 6 | Jerry | 加入產品 Marketing API | App 後台 |
| 7 | 媽媽 | 商業驗證（上傳崑家汽車公司登記，2–5 個工作天） | 商業管理工具 → 安全中心 |
| 8 | Jerry | App Review 申請 `ads_management`、`ads_read`、`business_management`、`pages_show_list`、`pages_read_engagement` | App Review → 權限與功能 |
| 9 | 媽媽 | 建立 System User → 指派資產 → 產生權杖 → 把權杖給 Jerry | 設定 → 系統使用者 |
| 10 | Jerry | 權杖填進 Railway 環境變數（見 `.env.example`） | Railway |

第 7、8 步是唯一慢的部分。前 6 步一個下午能做完。

## 驗證串好了沒

```bash
curl -s "https://graph.facebook.com/v21.0/me/adaccounts?access_token=$META_ACCESS_TOKEN" | jq
```

回傳含 `act_...` 就通了。

## 第一次下廣告前，一定要先做這件事

Meta 的預算單位是「該幣別的最小單位」，不同幣別的 `currency_offset` 不一樣。**猜錯就是 100 倍超支。**

```ts
const info = await getAdAccountInfo(cfg);
console.log(info.currency, info.currencyOffset, info.minDailyBudget);
// 用實際回傳的 offset 換算，不要寫死
const budget = toMinorUnits(500, info.currencyOffset); // NT$500/天
```

`server/metaAds.ts` 有兩道防護：`toMinorUnits` 拒絕不合理的 offset，`assertBudgetSane` 擋掉超過 `DAILY_BUDGET_CEILING_MINOR` 的預算。要突破上限必須明確傳 `allowAbove=true`。

## 所有東西都是 PAUSED 建立的

`createCampaign` / `createAdSet` / `createAd` 一律寫死 `status: "PAUSED"`。

**唯一會開始花錢的函式是 `activateAd()`**，它被刻意獨立出來，方便 code review 直接 grep。流程是：程式建好 → 在廣告管理員後台肉眼確認 → 才呼叫 `activateAd`。

## 用法

```ts
import { loadMetaAdsConfig, getAdAccountInfo, toMinorUnits, launchVehicleAd } from "./metaAds";

const cfg = loadMetaAdsConfig();          // 沒設定環境變數時回傳 null
if (!cfg) throw new Error("Meta ads not configured");

const info = await getAdAccountInfo(cfg);

const result = await launchVehicleAd(cfg, vehicle, {
  imageUrl: "https://kuncar.tw/...jpg",
  baseUrl: "https://kuncar.tw",
  dailyBudgetMinor: toMinorUnits(500, info.currencyOffset),
  radius: { latitude: 22.6396, longitude: 120.3021, radiusKm: 30 }, // 高雄三民區
});
// result.active === false — 還沒上線
```

## 已知風險

Jerry 的個人廣告帳號有被停權紀錄。Meta 的停權判定是實體層級（會串個人檔案、付款方式、裝置、IP、擔任管理員的商業檔案），所以：

- 商業檔案由**媽媽**建立、**媽媽**當擁有者
- 付款方式用**店裡的**，不要用 Jerry 個人的卡
- Jerry 拿「廣告主」而非「管理員」，降低關聯權重
- 拿到 token 之後，**不要用自己的瀏覽器登入這個廣告帳號後台**，讀報表走 `getInsights()`

停權狀態查詢：`facebook.com/business-support-home`（`facebook.com/accountquality` 會轉址到這裡）→「查看我的帳號」。
