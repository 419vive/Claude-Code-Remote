# Active Project: 崑家汽車 (Kunjia Autos) — LINE chatbot + admin dashboard

Latest (2026-07-15): Ran the SEO content loop (`kun-auto-chatbot/docs/SEO_LOOP.md`).
Two PRs merged to main + a full-auto weekly Routine now runs the loop hands-off.

**Merged today:**
- **PR #109 → main `b936a80`:** `server/seo.ts` now derives ALL blog SEO from
  `client/src/data/blogPosts.ts` (single source of truth). Was hardcoded:
  sitemap listed 6 posts, `blogMeta` covered ~12/47 → ~35 posts had no
  server meta + weren't in sitemap. Now every post auto-gets meta + Article +
  Person + Breadcrumb + **FAQPage** (extracted from its own `<h3>Q：…</h3>`
  blocks) JSON-LD, `og:type=article`, and a sitemap `<url>` (deduped by slug,
  updatedAt as lastmod). **New articles are covered automatically — no seo.ts
  edits ever again.** Verified: tsc 11 baseline (none in seo.ts); build clean;
  47/47 posts render Article+desc, 26/47 FAQPage, sitemap 47 deduped URLs.
- **PR #108 → main `e6a816c`:** first loop article 二手 Altis 買哪一代
  (`used-altis-which-generation`) + `docs/SEO_LOOP.md`. Merged AFTER #109 so
  Altis auto-got its meta/sitemap. Queue row #1 = ✅; next is #2 泡水車怎麼看.

**Full-auto Routine (Jerry chose 全自動 + 每週2篇):**
Trigger `trig_01EMJ2DpqvXmkhwAMS8xNuPz`, cron `0 1 * * 2,5` (Tue+Fri 09:00
Taiwan, fresh session each fire, push notif). First run Fri 2026-07-17. Each
fire: next `☐` queue keyword → fact-checked single-keyword article matching
blogPosts.ts schema → **tsc+build gate: auto-merge only if clean, else draft
PR + stop.** Runs in the cloud env — Jerry's computer being off doesn't matter.

## NEXT ACTION
Nothing required. Fri 2026-07-17 the Routine auto-writes post #2 (泡水車怎麼看)
and (if build clean) auto-merges → Railway deploys; Jerry gets a push. Watch
the FIRST auto-run's outcome — confirm the cron session has GitHub access to
open+merge the PR (if not, it'll push a branch + draft PR, needs a manual merge).

## Open Blockers
- **GSC unreachable from sandbox** → the loop's VERIFY/LEARN half (rankings,
  impressions) can't be automated here; stays manual or needs GSC API wired up.
- Railway auto-deploy sometimes needs a manual redeploy.
- Sandbox firewall: cannot reach Railway/kuncar.tw by ANY tool — live
  verification is always Jerry's.
- Dashboard UI for admin mutations not built (backend ready).

## Key Knowledge
- **SEO loop is now semi-autonomous:** meta/sitemap plumbing fully auto (#109);
  content on a cloud cron (每週2篇). Expect auto `seo/<slug>` PRs every Tue/Fri
  — that's the Routine, not a bug. Pause/retune via
  `mcp__Claude_Code_Remote__update_trigger`/`delete_trigger` on the trig id.
- **tsc baseline is 11.** Never dismiss "pre-existing" errors in NEW files.
- **blogPosts.ts has 2 duplicate slugs** (`used-car-price-guide`,
  `used-car-warranty-guide`); find + sitemap dedupe keep first occurrence.
  Deduping the data file is a deferred follow-up.
- **seo.ts still hardcodes ~5-6 posts in `llms.txt` + the AI-content text list**
  (not migrated in #109; out of scope). Follow-up if llms.txt should be full.
- **GitHub Actions "Deploy to Production" is a dead scaffold** — its failures
  don't mean Railway didn't deploy (Railway deploys via its own integration).
- **Stack:** Node/Express/Drizzle/MySQL + Gemini 2.5 Flash + LINE + 8891 sync.
- **Family context:** Jerry's father (70) uses phone; Megan onboarding.

## Deployed + Working
- All 47+ blog posts now have server-rendered meta + JSON-LD + sitemap entries.
- Web chat: sanitize/streaming/guardrail/polling fixes (PR #106) live.
- Permanent AI lockout (`aiDisabled`) honored on web; in-LINE operator controls;
  phantom-vehicle guardrail + Fact Lock in web prompt; SSE streaming + polling.
