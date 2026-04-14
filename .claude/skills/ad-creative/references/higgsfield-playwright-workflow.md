# Higgsfield × Playwright MCP — Automation Workflow

Operational playbook for driving Higgsfield (NanoBanana 2 images + **Seedance 2.0** videos) with Claude Code via Playwright MCP. This covers the *how-to-automate* layer.

**Three complementary layers:**
- **Catalog** — what tools exist, pricing, capabilities → see [generative-tools.md](./generative-tools.md)
- **Operations** — *this file* — browser automation, JS selectors, polling, downloads, recovery
- **Prompt craft by genre** — 15 `seedance-*` skills in `.claude/skills/` covering cinematic, 3d-cgi, cartoon, comic-to-video, fight-scenes, motion-design-ad, ecommerce-ad, anime-action, product-360, music-video, social-hook, brand-story, fashion-lookbook, food-beverage, real-estate. Invoke the one that matches the shot you're making.

> Use this when you want to batch-generate creative on Higgsfield without babysitting the browser. The key trick is clearing the content-editable prompt bar via JS between generations so state doesn't leak between prompts.

---

## Install

One-time setup in the project folder that will drive Higgsfield (separate from this kunjia-autos repo — do not install Playwright MCP into the chatbot project):

```bash
# Claude Code itself (if not installed)
npm install -g @anthropic-ai/claude-code

# Add Playwright MCP to Claude Code
claude mcp add playwright npx '@playwright/mcp@latest'

# Restart and verify
# inside claude:
/mcp   # should list `playwright`
```

Playwright opens its own controlled Chromium — expected, not your personal Chrome.

---

## Project layout

The Higgsfield workspace is a separate project folder from the kunjia-autos repo:

```
higgsfield-workspace/
├── CLAUDE.md              # workflow rules for this workspace (NOT the kunjia-autos CLAUDE.md)
├── SESSION-RESUME.md      # crash-recovery state
├── images/                # NanoBanana 2 outputs, organized by date
├── videos/                # Seedance 2.0 outputs, organized by date
├── reference/             # reference images for image-to-video
└── output/                # post-processed final assets
```

---

## The prompt-bar JS fix (the one thing you must not skip)

Higgsfield's content-editable prompt bar does NOT reliably clear between batch prompts. Text bleeds in, Claude types into a dirty field, the whole batch poisons itself. Always clear via JS before typing.

**Image page** (`higgsfield.ai/image/nano_banana_2`):
```js
const editor = document.querySelector('[id="hf:tour-image-prompt"] [contenteditable]')
  || document.querySelector('[contenteditable="true"]');
editor.innerHTML = '<p><br></p>';
editor.dispatchEvent(new Event('input', { bubbles: true }));
```

**Video page** (`higgsfield.ai/create/video/` — Seedance 2.0):
```js
const editor = document.querySelector('[id="hf:tour-video-prompt"] [contenteditable]')
  || document.querySelector('[contenteditable="true"]');
editor.innerHTML = '<p><br></p>';
editor.dispatchEvent(new Event('input', { bubbles: true }));
```

> The image selector does **not** work on the video page. Label both clearly in your workspace CLAUDE.md so Claude picks the right one per page.

---

## Seedance 2.0 video workflow (per prompt)

1. Navigate to `higgsfield.ai/create/video/`
2. Confirm model = **Seedance 2.0 Fast**, aspect = 9:16, duration = 8s, resolution = 720p (or whatever the run requires — confirm every batch)
3. For each prompt:
   1. Run the **video-page JS clear** snippet above
   2. Screenshot → visually confirm bar is empty. If not, clear again.
   3. Type the prompt with `slowly: true`
   4. Click **Generate**
   5. Run the JS clear **immediately after** clicking Generate (prevents stale text in next iteration)
   6. Poll every 15s for the download button. **Do not time out early — Seedance video takes 60–180s** depending on duration/resolution.
   7. Click download, confirm `.mp4` saves
   8. Rename using `[prompt-keyword]-[index].mp4` and move to `videos/YYYY-MM-DD/`
   9. Next prompt

### Image-to-video (reference image as first frame)

Seedance 2.0 supports a reference image as frame 0:

1. Put the reference file in `reference/`
2. In workspace CLAUDE.md: `Reference image: ON` + explicit path
3. Claude uploads the reference via Playwright **before** running the JS clear + type steps above
4. Use **absolute paths** — Playwright's file upload needs them, not relative

For mixed batches (different reference per prompt), list the `reference/<file>` path next to each prompt in `SESSION-RESUME.md`.

---

## NanoBanana 2 image workflow (per prompt)

Same structure as video, but faster and no download step — outputs appear inline on the page.

1. Navigate to `higgsfield.ai/image/nano_banana_2`
2. Confirm settings (aspect 9:16, 8 images/prompt, 2K unlimited ON, extra free gens OFF)
3. For each prompt:
   1. Run **image-page JS clear**
   2. Screenshot to confirm empty
   3. Type slowly
   4. Click Generate
   5. Run JS clear again
   6. Wait 7s
   7. Save outputs to `images/YYYY-MM-DD/`

---

## SESSION-RESUME.md — crash recovery

Claude Code sessions can drop mid-batch. Without a resume file you lose the state. Keep `SESSION-RESUME.md` up-to-date as generations complete, then on crash run:

> **Read SESSION-RESUME.md and continue from where we left off.**

### Image template
```markdown
# Session Resume — Image

## Model
NanoBanana 2, URL: higgsfield.ai/image/nano_banana_2

## Settings
- Aspect ratio: 9:16
- 2K unlimited: ON
- Extra free gens: OFF

## Progress
| # | Description         | Status    |
|---|---------------------|-----------|
| 1 | [subject/character] | Generated |
| 2 | [subject/character] | Generated |
| 3 | [subject/character] | Pending   |

## Next: #3
```

### Video template
```markdown
# Session Resume — Video

## Model
Seedance 2.0, URL: higgsfield.ai/create/video/

## Settings
- Aspect ratio: 9:16
- Duration: 8s
- Resolution: 720p
- Reference image: OFF

## Progress
| # | Prompt description | Reference image      | Status    |
|---|--------------------|----------------------|-----------|
| 1 | [scene/subject]    | reference/img-01.png | Generated |
| 2 | [scene/subject]    | none                 | Generated |
| 3 | [scene/subject]    | reference/img-03.png | Pending   |

## Next: #3
## Last known state: Browser open, on video page, settings confirmed.
```

---

## Workspace CLAUDE.md skeleton

This is the `CLAUDE.md` for the Higgsfield workspace folder — **not** the kunjia-autos repo's root CLAUDE.md. Customize per run:

```markdown
# Higgsfield Workflow

## Tools
- Image: Higgsfield NanoBanana 2
- Video: Higgsfield Seedance 2.0 Fast

## Default Image Settings
Aspect ratio: 9:16 | Count: 8 | 2K unlimited: ON | Extra free gens: OFF

## Default Video Settings (Seedance 2.0)
URL: higgsfield.ai/create/video/
Model: Seedance 2.0 Fast
Aspect: 9:16 | Duration: 8s | Resolution: 720p
Reference image: OFF by default

## JS Clear Snippets
- Image page: [id="hf:tour-image-prompt"] → paste full snippet
- Video page: [id="hf:tour-video-prompt"] → paste full snippet

## Rules
- Always clear prompt bar via JS before typing. Never skip.
- Always screenshot after clearing to visually confirm empty.
- Always confirm model = Seedance 2.0 before video generation.
- Never start next generation until current video has fully downloaded.
- Video wait: poll every 15s; do not time out under 3 min.
- Save outputs to /images/YYYY-MM-DD/ or /videos/YYYY-MM-DD/.
- Use absolute paths for reference image uploads.
```

---

## Common issues

| Issue | Fix |
|---|---|
| `/mcp` doesn't show playwright | Re-run `claude mcp add playwright ...` and restart Claude |
| Claude opens a new browser window | Normal — Playwright uses its own controlled browser |
| Claude generates before you're ready | Add `Always wait for confirmation before generating` to workspace CLAUDE.md |
| Prompt bar not clearing between prompts | JS clear must be explicit in CLAUDE.md — Claude skips it if it's only implied |
| Session crashed mid-batch | Tell Claude: *"Read SESSION-RESUME.md and continue from where we left off"* |
| Video generation never completes | Keep polling every 15s. After 3 min, refresh and check the **history tab** for the completed clip |
| Download button doesn't trigger file save | Click via Playwright, then move from browser's default downloads folder to `videos/YYYY-MM-DD/` |
| Wrong model selected (not Seedance 2.0) | Add model-check rule to CLAUDE.md: `Always confirm model is set to Seedance 2.0 before generating` |
| JS clear snippet not working on video page | Using the image-page selector on the video page — switch to the video-specific one |
| Reference image not uploading | File path in CLAUDE.md must be absolute, not relative |

---

## The core idea

`CLAUDE.md` defines the rules. Playwright MCP gives Claude hands. Together they turn Claude into an operator: *idea → Claude → generation*, instead of *idea → manual prompts → generation*.

Define it once per workspace. Re-run forever.
