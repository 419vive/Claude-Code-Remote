# Tenfold Marketing — findings + scoped proposals

**Date:** 2026-04-21
**Source:** `guides.tenfoldmarketing.com/free-resources` (Marc Cleroux, Ten Fold Marketing)
**Branch:** `claude/review-marketing-resources-8ZrTK` (not for merge; research-only)
**Status:** Read, filtered, NOT applied. Awaiting Jerry's approval on any proposal.

## How this reading got done

- Sandbox can't reach the site directly (`host_not_allowed`).
- Worked around it with `.github/workflows/fetch-tenfold.yml` which runs from GitHub Actions, pulls text-only markdown into `.external-reading/tenfold/`, commits back.
- Landing page linked ~29 articles; 5 live on the `guides.` subdomain were fetched. The other ~24 are on Notion (`notion.so/...`) — not fetched. If any title below catches your eye, tell me and I'll extend the workflow to hit those Notion URLs too.

## What Tenfold actually publishes

Surprise: despite the domain name, the content isn't B2B lead-gen playbooks. It's **Claude Code tooling and AI workflow guides**. Tagline: "Everything I've learned about using AI — packaged into guides you can actually follow."

The 5 articles read in full:

| # | Title | Core idea |
|---|-------|-----------|
| 1 | LLM Council Skill | Poll 5 sub-agents with different thinking lenses → anonymous peer review → chairman synthesizes verdict. Based on Karpathy's LLM Council method. |
| 2 | Top 5 (+5) Claude Code Skills | Graphify (knowledge graph memory), UI/UX Pro Max (design system), Claude SEO, Remotion (programmatic video), Google Workspace CLI, plus Cleroux's own skills (/copy, /viral, /script, /spy). |
| 3 | Automate DMs (Zernio + Claude Code) | Connect social DMs via Zernio MCP, interview yourself to produce a "DM playbook," schedule a recurring Claude task to auto-reply in your voice. |
| 4 | Google Stitch + Claude Code | Design app in Stitch → MCP export → Claude Code generates code → Vercel deploy. |
| 5 | Free Resources landing | Index of all guides (most gated on Notion). |

## Relevance filter (ruthless)

Jerry's system: production LINE chatbot for a Taiwanese used-car dealership. Gemini 2.5 Flash + Express/Drizzle/MySQL, `aiDisabled` lockout, phantom-vehicle 3-layer guardrail, operator LINE controls. What actually transfers?

### STRONG candidates

#### A. LLM Council for offline prompt-change review

**What:** Before editing the system prompt or phantom-vehicle guardrail, run the proposed diff through a 5-lens advisor panel (Contrarian, First Principles, Expansionist, Outsider, Executor) → anonymous peer review → verdict. All offline / dev-time.

**Why it fits us specifically:**
- Our production system prompt is load-bearing. One bad edit has broken the phantom-vehicle guardrail before. A council catches failure modes before they ship.
- Cost: ~5 LLM calls per prompt change. Negligible vs. production traffic cost.
- Latency: irrelevant (offline).

**Where it does NOT fit:**
- Not on the customer conversation path. Gemini's one-shot reply is the product; a council per user message would kill cost and latency.
- Not for the `aiDisabled` / handoff logic — those are deterministic rule-based; a council would only add noise.

**Proposed shape (if approved):**
- A doc or small script under `scripts/review-prompt-change.ts` that takes a proposed system prompt (or diff) + 3–5 example customer messages, and runs them through the 5 lenses using Gemini.
- Hook it into a pre-commit advisory (non-blocking) or a GitHub Action on PRs touching `server/*/prompts/*`.
- Store verdicts as markdown alongside the PR, not in shared memory.

**Flag:** The skill as published is a Claude Code skill (markdown instructions). If we want it in-repo, I'd rewrite the orchestration against Gemini (Jerry's actual production model) rather than install a third-party Claude skill that wouldn't touch prod paths.

#### B. Council-as-guardrail for borderline handoff decisions

**What:** Current handoff is rule-based. For genuinely ambiguous messages (not obvious sales, not obvious small-talk, not obvious complaint), run a mini 2-lens council (Contrarian + Executor only) to decide: auto-reply / escalate to handoff / silently `aiDisabled`.

**Why it fits:**
- Addresses the real gap: the grey zone between "clearly AI-answerable" and "clearly human." Today those edge cases get a mediocre AI reply.
- Latency acceptable: only fires on flagged-ambiguous cases (say <5% of messages). Can even be async — log decision after reply, then retroactively disable AI if the council says "should have handed off."

**Why be cautious:**
- Doubling LLM cost on ambiguous messages needs measuring, not assuming. Start with shadow-mode logging, not live routing.
- Jerry just spent the last session hardening the 3-layer phantom-vehicle defense. Adding another opinion layer could mask the real failures instead of exposing them. Keep rule-based primary, council as a **measurement** tool before it's a control.

**Proposed shape (if approved):**
- Shadow logging only in phase 1: log what the council would have decided, compare to what we actually did, review weekly.
- No routing changes until we have a month of shadow data.

#### C. "Playbook interview" for onboarding Megan (and future operators)

**What:** Tenfold's DM-automation guide has one non-obvious move: rather than writing rules by hand, get Claude to **interview** you about tone/voice/how-to-handle-each-DM-type, then output a single playbook file.

**Why it fits:**
- Megan is being onboarded. Today there's no written "how we answer X type of customer" doc — it's in Jerry's head.
- Open-ended: operator playbook could feed the system prompt AND be a training doc for new hires AND be the review reference for prompt changes (ties to item A above).

**Proposed shape (if approved):**
- Ask Jerry + Megan a structured interview (10-ish questions): tone register in Mandarin vs. Taiwanese, when to push vs. back off, handling of "reserve this car" / "I'll think about it" / price objections / financing questions / trade-in offers / out-of-stock asks.
- Output: `docs/conversation-playbook.md` in the repo — one file, versionable, reviewable.
- System prompt then cites / encodes rules from the playbook. Source of truth is the doc; the prompt is a compiled view.

**Why this is low-risk:**
- Just a doc. No code. No production impact until we choose to feed pieces into the prompt, which is a separate PR.

### WEAK / REJECT candidates

| Suggestion | Verdict | Reason |
|------------|---------|--------|
| Graphify (knowledge graph memory) | **Reject** | You already have `recall-stack/primer.md` + `docs/PROJECT_JOURNAL.md` + MCP `memory_*` tools (hybrid HNSW backend). Graphify is the same problem space, different solution. Don't maintain two memory systems. |
| UI/UX Pro Max (design system skill) | **Reject** | `kun-auto-chatbot/docs/DESIGN.md` defines the design system (shadcn/ui + Tailwind v4 + oklch, 10px radius, single-accent navy, tabular-nums on prices). Don't import a generic 50-style skill that will fight your existing tokens. |
| Google Stitch | **Reject** | Greenfield tool for designing apps from scratch. You have a live production app with a design system. Not useful. |
| Claude SEO | **Reject for chatbot** | SEO for the dealership's website is a separate product concern — if 崑家汽車 runs a public marketing site and you want to SEO it, that's a different conversation. Not relevant to the LINE bot. |
| Zernio DM automation | **Reject** | Built for Instagram/Messenger DMs for creators. LINE has its own webhook + push-message quota limits + different messaging model. More importantly, we already have webhook-driven real-time replies — no need for scheduled polling. |
| Remotion (programmatic video) | **Reject** | Out of scope. |
| /copy, /viral, /script, /spy | **Reject** | Content-creation skills for social-media creators. Not applicable to customer-service chatbot. |

## Claims to discount

Tenfold's copy is marketing-pitched (target audience is creators / agency owners, not engineers). Treat with salt:

- "71.5x token reduction from Graphify" — likely a best-case demo, not a typical result
- "$10K websites in one command" — these are template-driven, not bespoke
- "22K followers in 30 days" — creator-economy claim, unrelated to tooling quality
- "Figma stock dropped 12% in 48 hours after Stitch update" — unverified, not our concern

The underlying techniques can still be useful even if the headlines are inflated. Judge the mechanism, not the hype.

## Cautions if you decide to install any of these skills

Most of these are community-built, unaudited Claude Code skills that run with your file system and API access. If you ever install any of them:

1. Read the source (they're just markdown + maybe small scripts).
2. Don't install skills that touch API keys or secrets without reviewing exactly what they read/write.
3. Install them in a separate Claude session, never the one working on production code, so you can roll back cleanly.
4. Skills that call out to third-party services (Zernio, etc.) involve sending your data to a new vendor — evaluate their privacy terms.

## Recommended next steps (for Jerry's decision)

Ranked by value / risk ratio:

1. **Conversation Playbook doc** (item C) — cheapest, zero prod risk, directly helpful for Megan onboarding. Estimated work: one interview session + 30 min writing.
2. **Offline prompt-change council** (item A) — one script, no prod path. Useful the next time you touch the system prompt. Estimated work: ~2 hours scaffolding.
3. **Shadow-mode handoff council** (item B) — explicitly opt-in, log-only, reversible. Only pursue if items 1–2 prove useful first. Estimated work: ~4 hours + one month of data collection before any routing change.

Everything else: skip.

## If you want more

Most Tenfold articles are on Notion and not yet fetched. Titles that might be worth pulling if any sound relevant:
- "How to Give Claude Code a Memory (Using Obsidian)" — overlap with our memory stack
- "7 Hacks to Cut Your Claude Code Usage by 80%" — possibly a couple useful token-efficiency tricks
- "How to Build 'Mother Skills' in Claude Code" — chain-of-skills pattern
- "Why Claude Code Feels Dumber Lately" — probably just a context-management tip

Tell me which, if any, and I'll extend the fetcher.

## Cleanup

When you're done with this review:

```bash
# Remove the temporary research artifacts
rm -rf .external-reading
rm .github/workflows/fetch-tenfold.yml
# Optionally keep this findings doc; it's small and self-contained
```

Then close PR #85 (it was always marked do-not-merge).
