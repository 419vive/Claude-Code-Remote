# IG Sync — pull @mrlai_gogoya videos into vehicle inventory

Phase 1 pipeline: download public IG posts → match to DB vehicles by caption →
upload matched MP4s to VideoDB → write `videoUrl` back to `vehicles` row.

## TL;DR

```bash
# one-time install (pick one)
pipx install yt-dlp

# 1. list + download latest 30 video posts from @mrlai_gogoya
python scripts/ig-sync/download_ig_videos.py

# 2. propose vehicle matches (dry-run, writes match-plan.json)
npx tsx scripts/ig-sync/match_to_vehicle.ts

# 3. review match-plan.json by eye
#    -> fix any bad matches manually

# 4. upload matched mp4s to VideoDB + write videoUrl to DB
#    (still manual step; see "Phase 1 limitations" below)
```

## Why Phase 1 is manual on the last step

Writing `videoUrl` to a live vehicle row triggers cache invalidation,
chatbot prompt updates, and LINE Flex re-renders. We deliberately do
NOT automate that until a human has reviewed `match-plan.json` — the
caption-matcher is ~80% accurate; the last 20% needs human eyes.

## Phase 1 limitations (deliberately)

| Limitation | Why |
|---|---|
| Uses yt-dlp → fragile, violates IG TOS | POC only. Phase 2 = official IG Graph API (see below). |
| No DB writes | Match confidence < 1.0 on captions alone; human gate needed. |
| English-only brand hints for now | Brand alias table in `match_to_vehicle.ts`; expand as needed. |
| Throttle: 3s between downloads | Be nice to IG, don't trigger anti-bot. |

## Phase 2 upgrade path (when ready)

Replace `download_ig_videos.py` with `graph_api_sync.py` using
[Instagram Graph API](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api):

1. Sister converts her IG account to a **Creator** or **Business** account
   (Settings → Account → Switch to Professional Account). Free, doesn't change
   what viewers see.
2. She connects it to a Facebook Page she owns.
3. You create a Meta app (developers.facebook.com), add "Instagram Graph API".
4. She grants your app `instagram_basic` + `pages_show_list` (one OAuth click).
5. You get a long-lived access token, never expires unless revoked.
6. Fetch her media via `GET /{ig-user-id}/media` — 100% TOS-compliant,
   200 calls/hour rate limit, stable for production.

**Migration is a one-day swap** — keep `match_to_vehicle.ts` unchanged, only
the fetcher script swaps. yt-dlp stays as a fallback for when the API is down.

## Files

```
scripts/ig-sync/
├── download_ig_videos.py     # Phase 1: yt-dlp fetcher
├── match_to_vehicle.ts       # Phase 1+2: caption → vehicle row matcher
├── requirements.txt          # Python deps
├── ig-raw/                   # .gitignored — downloaded mp4 + json
│   └── <shortcode>.mp4
└── match-plan.json           # .gitignored — human-review artifact
```

## What gets stored where

| Artifact | Location | Lifecycle |
|---|---|---|
| Raw `.mp4` | `scripts/ig-sync/ig-raw/<shortcode>.mp4` | Local-only, gitignored, uploaded to VideoDB then optionally deleted |
| Caption JSON | `scripts/ig-sync/ig-raw/<shortcode>.info.json` | Same |
| Match plan | `scripts/ig-sync/match-plan.json` | Regenerated each run |
| Final playable URL | `vehicles.videoUrl` (MySQL via Drizzle) | Persistent, powers VehicleLanding + LINE Flex + chatbot |

## Safety rules

1. **Never commit `ig-raw/` to git.** It contains unpublished versions of
   @mrlai_gogoya content. `.gitignore` already excludes it.
2. **Never run `--apply` without reviewing match-plan.json by eye.**
   A bad match displays the wrong car's video on the wrong vehicle page →
   misrepresentation under 消費者保護法.
3. **If yt-dlp starts failing repeatedly**, IG has likely flagged the source
   IP. Stop, switch to Phase 2 Graph API, don't retry-loop.
4. **Don't use scraped content from any other IG account.** This pipeline
   is authorized for @mrlai_gogoya only (operator's sister, consented use).
