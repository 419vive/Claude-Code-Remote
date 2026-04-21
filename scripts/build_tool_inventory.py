#!/usr/bin/env python3
"""Extract name+description from agent/skill markdown files into one inventory."""
import os
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT = REPO_ROOT / "docs" / "TOOL_INVENTORY.md"
USER_AGENTS = Path.home() / ".claude" / "agents"
USER_SKILLS = Path.home() / ".claude" / "skills"
PROJ_AGENTS = REPO_ROOT / ".claude" / "agents"
PROJ_SKILLS = REPO_ROOT / ".claude" / "skills"


def parse_frontmatter(text):
    """Return dict of YAML frontmatter fields (simple k:v only)."""
    m = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not m:
        return {}
    fm = {}
    current_key = None
    buf = []
    for line in m.group(1).splitlines():
        # Match "key: value" or "key:"
        km = re.match(r"^([a-zA-Z_][\w-]*)\s*:\s*(.*)$", line)
        if km:
            if current_key:
                fm[current_key] = " ".join(buf).strip().strip('"\'')
            current_key = km.group(1)
            buf = [km.group(2)]
        elif current_key and line.strip():
            # continuation
            buf.append(line.strip())
    if current_key:
        fm[current_key] = " ".join(buf).strip().strip('"\'')
    return fm


def short(s, n=180):
    s = re.sub(r"\s+", " ", s).strip()
    if len(s) > n:
        return s[: n - 1] + "…"
    return s


def scan_agents(root, label):
    """Return list of (category, name, description, relpath) for agent .md files."""
    results = []
    if not root.exists():
        return results
    for p in sorted(root.rglob("*.md")):
        try:
            text = p.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        fm = parse_frontmatter(text)
        name = fm.get("name") or p.stem
        desc = fm.get("description", "")
        if not desc:
            # Skip files without frontmatter description — likely not real agents
            # But try to get a first-paragraph hint
            body = re.sub(r"^---.*?---\s*", "", text, count=1, flags=re.DOTALL)
            first = next((l for l in body.splitlines() if l.strip() and not l.startswith("#")), "")
            desc = first.strip()
        rel = p.relative_to(root)
        category = str(rel.parent) if rel.parent != Path(".") else "_root"
        results.append((category, name, short(desc), str(rel)))
    return results


def scan_skills(root):
    """Skills are directories with SKILL.md or similar."""
    results = []
    if not root.exists():
        return results
    for d in sorted(root.iterdir()):
        if not d.is_dir():
            continue
        # Find SKILL.md or first .md
        md = d / "SKILL.md"
        if not md.exists():
            mds = sorted(d.glob("*.md"))
            md = mds[0] if mds else None
        desc = ""
        name = d.name
        if md and md.exists():
            try:
                text = md.read_text(encoding="utf-8", errors="replace")
                fm = parse_frontmatter(text)
                desc = fm.get("description", "")
                if fm.get("name"):
                    name = fm["name"]
                if not desc:
                    body = re.sub(r"^---.*?---\s*", "", text, count=1, flags=re.DOTALL)
                    first = next((l for l in body.splitlines() if l.strip() and not l.startswith("#")), "")
                    desc = first.strip()
            except Exception:
                pass
        results.append((name, short(desc), str(d.name)))
    return results


def write_section(f, title, items, kind="agent"):
    if not items:
        f.write(f"\n_No {kind}s found._\n")
        return
    if kind == "agent":
        # group by category
        by_cat = {}
        for cat, name, desc, path in items:
            by_cat.setdefault(cat, []).append((name, desc, path))
        for cat in sorted(by_cat):
            f.write(f"\n### {cat}\n\n")
            f.write("| Name | Description | File |\n|---|---|---|\n")
            for name, desc, path in sorted(by_cat[cat], key=lambda x: x[0].lower()):
                f.write(f"| **{name}** | {desc} | `{path}` |\n")
    else:  # skill
        f.write("\n| Name | Description |\n|---|---|\n")
        for name, desc, _ in sorted(items, key=lambda x: x[0].lower()):
            f.write(f"| **{name}** | {desc} |\n")


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    user_agents = scan_agents(USER_AGENTS, "user")
    proj_agents = scan_agents(PROJ_AGENTS, "project")
    user_skills = scan_skills(USER_SKILLS)
    proj_skills = scan_skills(PROJ_SKILLS)

    with OUT.open("w", encoding="utf-8") as f:
        f.write("# Tool Inventory — Agents & Skills\n\n")
        f.write("_Generated automatically. Re-run `python3 scripts/build_tool_inventory.py` to refresh._\n\n")
        f.write("## Summary\n\n")
        f.write(f"- **User-installed agents** (`~/.claude/agents/`): **{len(user_agents)}**\n")
        f.write(f"- **Project agents** (`.claude/agents/`): **{len(proj_agents)}**\n")
        f.write(f"- **User-installed skills** (`~/.claude/skills/`): **{len(user_skills)}**\n")
        f.write(f"- **Project skills** (`.claude/skills/`): **{len(proj_skills)}**\n")
        f.write(f"- **Harness built-ins**: see section at bottom (not file-based, cannot be copied)\n\n")

        f.write("## How to transfer to another project (e.g. `jerry_job_hunt`)\n\n")
        f.write("```bash\n")
        f.write("# Option 1: pin to the new project (versioned with repo)\n")
        f.write("cp -r ~/.claude/agents  /path/to/jerry_job_hunt/.claude/agents\n")
        f.write("cp -r ~/.claude/skills  /path/to/jerry_job_hunt/.claude/skills\n")
        f.write("cp -r $THIS_REPO/.claude/agents  /path/to/jerry_job_hunt/.claude/agents-kunjia\n")
        f.write("cp -r $THIS_REPO/.claude/skills  /path/to/jerry_job_hunt/.claude/skills-kunjia\n\n")
        f.write("# Option 2: keep global — they apply to every project automatically\n")
        f.write("# (user-level ~/.claude/ tools are auto-loaded anywhere Claude Code runs)\n")
        f.write("```\n\n")
        f.write("**Built-in tools** (the ones from the harness, like `general-purpose`, `brainstorming`, `pdf`, `xlsx`) ")
        f.write("are not files — they ship with Claude Code itself. You get them free on any machine where Claude Code is installed.\n\n")

        f.write("---\n\n# User-Installed Agents\n")
        f.write(f"_Location: `~/.claude/agents/` — {len(user_agents)} agents_\n")
        write_section(f, "User Agents", user_agents, "agent")

        f.write("\n---\n\n# Project Agents\n")
        f.write(f"_Location: `.claude/agents/` — {len(proj_agents)} agents_\n")
        write_section(f, "Project Agents", proj_agents, "agent")

        f.write("\n---\n\n# User-Installed Skills\n")
        f.write(f"_Location: `~/.claude/skills/` — {len(user_skills)} skills_\n")
        write_section(f, "User Skills", user_skills, "skill")

        f.write("\n---\n\n# Project Skills\n")
        f.write(f"_Location: `.claude/skills/` — {len(proj_skills)} skills_\n")
        write_section(f, "Project Skills", proj_skills, "skill")

        f.write("\n---\n\n# Harness Built-ins (reference only)\n\n")
        f.write("These come bundled with Claude Code. They are **not** files on disk and cannot be copied — ")
        f.write("but they are automatically available on any machine where Claude Code is installed.\n\n")
        f.write("The exact list is session-dependent. See the `## Available agents` and `## Available skills` ")
        f.write("sections of any Claude Code session's system prompt for a current roster.\n\n")
        f.write("Notable built-in agents include: `general-purpose`, `Explore`, `Plan`, `Code Reviewer`, ")
        f.write("`Backend Architect`, `Frontend Developer`, `Security Engineer`, `UX Researcher`, plus 300+ more.\n\n")
        f.write("Notable built-in skills include: `brainstorming`, `pdf`, `xlsx`, `docx`, `pptx`, `canvas-design`, ")
        f.write("`design-system`, `slides`, `skill-creator`, `using-git-worktrees`, plus 200+ more.\n")

    totals = (len(user_agents), len(proj_agents), len(user_skills), len(proj_skills))
    print(f"Wrote {OUT}")
    print(f"Counts: user_agents={totals[0]} proj_agents={totals[1]} user_skills={totals[2]} proj_skills={totals[3]}")
    print(f"File size: {OUT.stat().st_size} bytes")


if __name__ == "__main__":
    main()
