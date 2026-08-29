# Setup Guide: Load All Agents + Skills into `jerry_job_hunt` (macOS)

**Goal:** give your `jerry_job_hunt` project on your Mac access to every agent and skill documented in [`TOOL_INVENTORY.md`](./TOOL_INVENTORY.md).

**Time:** ~5 minutes.
**Prerequisites:** macOS, Terminal, git, [Claude Code](https://claude.com/code) installed.

---

## 🤖 EASIEST PATH — let Claude Code do it for you

1. Open Terminal on your Mac
2. Run:
   ```bash
   cd /Users/jerrylaivivemachi/jerry_job_hunt   # create with `mkdir -p` first if missing
   claude
   ```
3. Paste this entire prompt into Claude Code and press Enter:

> **Copy the block below — everything between the triple-backticks.**

````
Please set up this project folder with all the agents and skills documented at
https://github.com/419vive/kunjia-autos-ai-chatbot/blob/claude/review-agency-agents-56rSZ/docs/TOOL_INVENTORY.md

My project root is: /Users/jerrylaivivemachi/jerry_job_hunt
Target branch for the Kunjia repo: claude/review-agency-agents-56rSZ

Do these steps in order, stopping if anything fails:

1. Verify git is installed (`git --version`). If not, tell me to run `xcode-select --install`.

2. Create `~/.claude/agents/` if missing, then install 184 user-level agents from
   https://github.com/msitarzewski/agency-agents:
   - Clone with `--depth 1` to `/tmp/agency-agents`
   - Copy `.md` files from these directories only: academic, design, engineering,
     finance, game-development, marketing, paid-media, product, project-management,
     sales, spatial-computing, specialized, strategy, support, testing
   - Flatten into `~/.claude/agents/` (no subdirs)
   - Purge any file in `~/.claude/agents/` whose first line is NOT `---` (strips
     non-agent docs like QUICKSTART.md, phase-*.md, scenario-*.md)
   - Verify count is exactly 184 — if not, report the mismatch

3. Clone https://github.com/419vive/kunjia-autos-ai-chatbot (branch
   claude/review-agency-agents-56rSZ, `--depth 1`) to `/tmp/kunjia`.

4. In my project root (/Users/jerrylaivivemachi/jerry_job_hunt):
   - Create `.claude/` and `docs/` if missing
   - Copy `/tmp/kunjia/.claude/agents` → `./.claude/agents` (244 files expected)
   - Copy `/tmp/kunjia/.claude/skills` → `./.claude/skills` (192 dirs expected)
   - Copy `/tmp/kunjia/docs/TOOL_INVENTORY.md` → `./docs/TOOL_INVENTORY.md`
   - Copy `/tmp/kunjia/docs/JERRY_JOB_HUNT_SETUP.md` → `./docs/JERRY_JOB_HUNT_SETUP.md`
   - Copy `/tmp/kunjia/scripts/build_tool_inventory.py` → `./scripts/build_tool_inventory.py`

5. Clean up `/tmp/agency-agents` and `/tmp/kunjia`.

6. Print a final summary with these four counts:
   - `~/.claude/agents/` count (expect 184)
   - `./.claude/agents/*.md` recursive count (expect 244)
   - `./.claude/skills/` subdir count (expect 192)
   - Whether `./docs/TOOL_INVENTORY.md` exists

Do NOT modify any existing files in my project. Do NOT commit or push anything.
Only install/copy the files above. If a target file already exists with the
same name, ask me before overwriting.
````

4. Claude will run the install and show you a final count. Done.

---

## 🚀 Alternative: one-command setup (copy-paste this whole block into Terminal)

> Adjust `PROJECT` on line 1 if your `jerry_job_hunt` folder lives somewhere else.

```bash
PROJECT="/Users/jerrylaivivemachi/jerry_job_hunt"

set -e
mkdir -p "$PROJECT" ~/.claude/agents
cd "$PROJECT"

# 1. Install 184 user-level agents from agency-agents repo
git clone --depth 1 https://github.com/msitarzewski/agency-agents.git /tmp/agency-agents
(cd /tmp/agency-agents && find academic design engineering finance game-development \
  marketing paid-media product project-management sales spatial-computing \
  specialized strategy support testing -name "*.md" \
  -exec cp {} ~/.claude/agents/ \;)
# Purge non-agent docs (no YAML frontmatter)
(cd ~/.claude/agents && for f in *.md; do head -1 "$f" | grep -q '^---$' || rm "$f"; done)

# 2. Copy 244 project agents + 192 skills + inventory doc from Kunjia repo
git clone --depth 1 --branch claude/review-agency-agents-56rSZ \
  https://github.com/419vive/kunjia-autos-ai-chatbot.git /tmp/kunjia
mkdir -p "$PROJECT/.claude" "$PROJECT/docs"
cp -r /tmp/kunjia/.claude/agents "$PROJECT/.claude/agents"
cp -r /tmp/kunjia/.claude/skills "$PROJECT/.claude/skills"
cp    /tmp/kunjia/docs/TOOL_INVENTORY.md "$PROJECT/docs/TOOL_INVENTORY.md"

# 3. Clean up
rm -rf /tmp/agency-agents /tmp/kunjia

# 4. Verify
echo ""
echo "✅ Done. Counts:"
echo "   User agents   (~/.claude/agents/):     $(ls ~/.claude/agents | wc -l | tr -d ' ')"
echo "   Project agents ($PROJECT/.claude/agents/): $(find "$PROJECT/.claude/agents" -name '*.md' | wc -l | tr -d ' ')"
echo "   Project skills ($PROJECT/.claude/skills/): $(ls "$PROJECT/.claude/skills" | wc -l | tr -d ' ')"
```

Expected output:
```
✅ Done. Counts:
   User agents   (~/.claude/agents/):     184
   Project agents (...):                  244
   Project skills (...):                  192
```

---

## 📖 Step-by-step (if the one-liner scares you)

### Step 1 — Open Terminal
`Cmd + Space` → type `Terminal` → Enter.

### Step 2 — Decide where `jerry_job_hunt` lives
```bash
# If the folder doesn't exist yet:
mkdir -p /Users/jerrylaivivemachi/jerry_job_hunt
cd /Users/jerrylaivivemachi/jerry_job_hunt

# If it already exists elsewhere, cd to it instead.
```

### Step 3 — Install 184 agency-agents (user-level, available in ALL projects)
```bash
mkdir -p ~/.claude/agents
git clone --depth 1 https://github.com/msitarzewski/agency-agents.git /tmp/agency-agents
cd /tmp/agency-agents
find academic design engineering finance game-development marketing \
     paid-media product project-management sales spatial-computing \
     specialized strategy support testing \
     -name "*.md" -exec cp {} ~/.claude/agents/ \;
cd ~/.claude/agents
for f in *.md; do head -1 "$f" | grep -q '^---$' || rm "$f"; done
ls ~/.claude/agents | wc -l   # should say 184
```

### Step 4 — Copy the Kunjia project's agents + skills into `jerry_job_hunt`
```bash
git clone --depth 1 --branch claude/review-agency-agents-56rSZ \
  https://github.com/419vive/kunjia-autos-ai-chatbot.git /tmp/kunjia

cd /Users/jerrylaivivemachi/jerry_job_hunt
mkdir -p .claude docs

cp -r /tmp/kunjia/.claude/agents ./.claude/agents
cp -r /tmp/kunjia/.claude/skills ./.claude/skills
cp    /tmp/kunjia/docs/TOOL_INVENTORY.md ./docs/TOOL_INVENTORY.md
```

### Step 5 — Clean up temp files
```bash
rm -rf /tmp/agency-agents /tmp/kunjia
```

### Step 6 — Verify
```bash
cd /Users/jerrylaivivemachi/jerry_job_hunt
ls ~/.claude/agents | wc -l           # 184
find .claude/agents -name '*.md' | wc -l   # 244
ls .claude/skills | wc -l             # 192
cat docs/TOOL_INVENTORY.md | head     # should show the inventory
```

### Step 7 — Start Claude Code in the project
```bash
cd /Users/jerrylaivivemachi/jerry_job_hunt
claude
```

In chat, try: `"Show me docs/TOOL_INVENTORY.md and recommend three agents that could help me with job hunting."`

---

## 🧠 What you now have on your Mac

| Tier | Where | How many | Shared across projects? |
|---|---|---|---|
| User-installed agents | `~/.claude/agents/` | 184 | ✅ yes — auto-available anywhere |
| Project agents | `<project>/.claude/agents/` | 244 | ❌ only inside `jerry_job_hunt` |
| Project skills | `<project>/.claude/skills/` | 192 | ❌ only inside `jerry_job_hunt` |
| Harness built-ins | inside Claude Code itself | ~500+ | ✅ free on any machine with Claude Code |

Full searchable list: [`docs/TOOL_INVENTORY.md`](./TOOL_INVENTORY.md) inside jerry_job_hunt after setup.

---

## 🆘 Troubleshooting

**"command not found: git"** → install Xcode Command Line Tools: `xcode-select --install`

**"command not found: claude"** → install Claude Code from https://claude.com/code

**"Permission denied" on `/tmp`** → unlikely on macOS. If it happens: use `~/tmp` instead.

**Wrong path for `jerry_job_hunt`** → just change the `PROJECT=` line at the top of the one-liner.

**Want to uninstall the 184 user agents** → `rm -rf ~/.claude/agents/*`

**Want to regenerate the inventory after you add more agents** →
```bash
cd /Users/jerrylaivivemachi/jerry_job_hunt
python3 /tmp/kunjia/scripts/build_tool_inventory.py   # if you kept the clone
```
(Or grab `build_tool_inventory.py` from the Kunjia repo's `scripts/` folder.)

---

## 🔗 Reference links

- **Inventory doc (GitHub):** https://github.com/419vive/kunjia-autos-ai-chatbot/blob/claude/review-agency-agents-56rSZ/docs/TOOL_INVENTORY.md
- **Agency-agents source:** https://github.com/msitarzewski/agency-agents
- **Kunjia repo (branch used):** https://github.com/419vive/kunjia-autos-ai-chatbot/tree/claude/review-agency-agents-56rSZ
- **Claude Code:** https://claude.com/code
