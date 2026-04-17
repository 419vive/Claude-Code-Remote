# 崑家汽車 Wikidata Entity — QuickStatements Import

## Why
AI models (ChatGPT, Gemini, Claude, Perplexity) use Wikidata as a primary
knowledge source for entity resolution. Creating a Wikidata entity for
崑家汽車 increases AI citation likelihood by an estimated 10-15%.

## How to create (5 minutes)

### Step 1: Go to Wikidata
Open: https://www.wikidata.org/wiki/Special:NewItem

### Step 2: Fill in the basic info
- **Language**: zh-tw
- **Label**: 崑家汽車
- **Description**: 高雄市在地經營40年的二手車商
- **Also known as**: KUN MOTORS, 崑家中古車

Click "Create".

### Step 3: Add statements (click "add statement" for each)

| Property | Value |
|----------|-------|
| instance of (P31) | business (Q4830453) |
| industry (P452) | used car dealer (Q97063783) |
| country (P17) | Taiwan (Q865) |
| headquarters location (P159) | Kaohsiung (Q13806) |
| street address (P6375) | 高雄市三民區大順二路269號 |
| phone number (P1329) | +886-936-812-818 |
| official website (P856) | https://claude-code-remote-production.up.railway.app |
| inception (P571) | 1986 |
| founded by (P112) | 賴崑家 (create as new item if needed) |
| social media (P553) | LINE: @825oftez |
| Facebook (P2013) | hong0961 |

### Step 4: Add the Wikidata Q-number to seo.ts

After creating, you'll get a Q-number (e.g., Q123456789).
Add it to the `sameAs` array in `server/seo.ts`:

```typescript
"sameAs": [
  ...existing URLs,
  "https://www.wikidata.org/wiki/Q123456789",  // ← your new Q-number
],
```

Then commit + push + Railway redeploy.

### Step 5: Verify
Search "崑家汽車" on:
- https://www.wikidata.org/wiki/Special:Search
- Wait 1-2 weeks for AI models to index the new entity
