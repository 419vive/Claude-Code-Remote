#!/usr/bin/env python3
"""
graphifyy sandbox — AST-only graph builder (zero LLM cost).

WHY THIS SCRIPT EXISTS
----------------------
graphifyy has no standalone `graphify build` CLI. The documented way to
build a graph is to invoke the `claude install` skill, which instructs
Claude Code to spawn subagents that do semantic extraction on docs/images.
That:
  - installs a PreToolUse hook into .claude/settings.json (persistent),
  - writes instructions into CLAUDE.md (persistent),
  - runs real Claude subagents on every doc/md/image (real token cost),
  - is EXACTLY the agent-runtime integration we deliberately avoided.

This script does the ONE thing graphifyy is actually useful for without
any of that surface area: it calls graphify.detect + graphify.extract +
graphify.build directly, producing a deterministic AST-only graph from
code files only. No Claude API calls, no subagents, no PreToolUse hook,
no CLAUDE.md mutation, no persistent install.

The output is a standard graphify-out/graph.json that `graphify query`
and `graphify benchmark` can read normally.

LIMITATIONS (by design)
-----------------------
- Code-only. Does NOT index .md, .pdf, or images. Semantic-understanding
  nodes for docs/papers/images require Claude subagents (the risky path).
  If code-graph alone proves useful, we can consider a bounded semantic
  pass later with explicit per-chunk cost measurement.
- Skips binaries, lock files, archives via our own exclude list PLUS the
  built-in _is_sensitive() filter in graphify.detect (already skips .env,
  *.pem, *.key, credentials, id_rsa*, .netrc, etc.).

USAGE
-----
  source scripts/graphify-sandbox/.venv/bin/activate
  python scripts/graphify-sandbox/build_ast_graph.py                 # build against repo root
  python scripts/graphify-sandbox/build_ast_graph.py --root some/dir # build against a subdirectory
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Belt-and-suspenders exclusion list. graphify.detect already skips common
# secret patterns, but we ALSO skip:
#   - anything inside .claude/, .claude-flow/, .swarm/, .hive-mind/
#   - sandbox venvs and upstream clones
#   - binaries, lockfiles, archives, media
# These are filtered by walking ourselves, NOT by passing the repo root
# blindly to graphify.detect.
# ---------------------------------------------------------------------------
EXTRA_EXCLUDE_DIRS = {
    ".git",
    ".github",
    ".claude",
    ".claude-flow",
    ".swarm",
    ".hive-mind",
    ".next",
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".cache",
    ".venv",
    "venv",
    "__pycache__",
    "logs",
    "tmp",
    "out",
    "graph",
    "cache",
    # sandbox-specific
    "tribev2",
}

EXTRA_EXCLUDE_FILE_PATTERNS = [
    re.compile(r"\.(zip|tar\.gz|tgz|7z|rar)$", re.IGNORECASE),
    re.compile(r"\.(png|jpg|jpeg|gif|webp|svg|ico)$", re.IGNORECASE),
    re.compile(r"\.(mp4|mov|webm|mkv|avi|m4v|mp3|wav|m4a|ogg)$", re.IGNORECASE),
    re.compile(r"\.(pdf|doc|docx|xls|xlsx)$", re.IGNORECASE),
    re.compile(r"\.(sqlite|sqlite3|db)$", re.IGNORECASE),
    re.compile(r"\.(log|tsbuildinfo)$", re.IGNORECASE),
    re.compile(r"package-lock\.json$", re.IGNORECASE),
    re.compile(r"yarn\.lock$", re.IGNORECASE),
    re.compile(r"pnpm-lock\.yaml$", re.IGNORECASE),
    re.compile(r"uv\.lock$", re.IGNORECASE),
    re.compile(r"poetry\.lock$", re.IGNORECASE),
]

CODE_EXTS = {
    ".py", ".ts", ".js", ".jsx", ".tsx", ".go", ".rs", ".java",
    ".cpp", ".cc", ".cxx", ".c", ".h", ".hpp", ".rb", ".swift",
    ".kt", ".kts", ".cs", ".scala", ".php", ".lua", ".zig",
    ".ps1", ".ex", ".exs", ".m", ".mm", ".jl",
}

# Secret sweep patterns applied to the FINAL graph.json. graphify.detect
# already skips sensitive filenames, but a function body could still embed
# a secret literal that got extracted into a node label — this catches that.
SECRET_SWEEP = re.compile(
    r"sk-[A-Za-z0-9]{20,}"
    r"|xoxb-[A-Za-z0-9-]{20,}"
    r"|ghp_[A-Za-z0-9]{20,}"
    r"|AKIA[A-Z0-9]{16}"
    r"|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY"
    r"|CHANNEL_ACCESS_TOKEN\s*[:=]\s*['\"][A-Za-z0-9+/]{20,}"
    r"|CHANNEL_SECRET\s*[:=]\s*['\"][A-Za-z0-9+/]{20,}",
)


def collect_code_files(root: Path) -> list[Path]:
    """Walk root, yield code files, honor our own exclude rules."""
    out: list[Path] = []
    root_abs = root.resolve()
    for dirpath, dirnames, filenames in os.walk(root_abs):
        # prune excluded dirs in-place so os.walk skips them entirely
        dirnames[:] = [d for d in dirnames if d not in EXTRA_EXCLUDE_DIRS]
        for name in filenames:
            p = Path(dirpath) / name
            if p.suffix.lower() not in CODE_EXTS:
                continue
            if any(pat.search(name) for pat in EXTRA_EXCLUDE_FILE_PATTERNS):
                continue
            out.append(p)
    out.sort()
    return out


def format_bytes(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f}{unit}" if unit != "B" else f"{n}{unit}"
        n /= 1024
    return f"{n:.1f}TB"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--root", default=None, help="Repo root to index (default: kunjia-autos-ai-chatbot)")
    parser.add_argument("--out", default=None, help="Output dir (default: scripts/graphify-sandbox/out)")
    parser.add_argument("--directed", action="store_true", help="Build a directed graph (preserves edge direction)")
    parser.add_argument("--limit", type=int, default=None, help="Limit to first N files (for quick smoke tests)")
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    repo_root = Path(args.root).resolve() if args.root else script_dir.parent.parent
    out_dir = Path(args.out).resolve() if args.out else script_dir / "out"
    out_dir.mkdir(parents=True, exist_ok=True)

    # Import only after we've decided not to bail — these imports pull in
    # a lot of tree-sitter grammars.
    try:
        from graphify.extract import extract
        from graphify.build import build
        from networkx.readwrite import json_graph
    except ImportError as e:
        print(f"ERROR: graphify not importable — did you run setup.sh?  ({e})", file=sys.stderr)
        return 1

    print("=" * 72)
    print("graphifyy AST-only graph build (sandbox)")
    print("=" * 72)
    print(f"  Root:      {repo_root}")
    print(f"  Output:    {out_dir}")
    print(f"  Directed:  {args.directed}")
    print()

    # -- 1. collect code files -------------------------------------------
    t0 = time.perf_counter()
    code_files = collect_code_files(repo_root)
    if args.limit:
        code_files = code_files[: args.limit]
    t_collect = time.perf_counter() - t0

    # Distribution by extension
    by_ext: dict[str, int] = {}
    for p in code_files:
        by_ext[p.suffix] = by_ext.get(p.suffix, 0) + 1
    top_exts = sorted(by_ext.items(), key=lambda kv: -kv[1])[:8]

    print(f"Collected {len(code_files)} code files in {t_collect:.2f}s")
    for ext, n in top_exts:
        print(f"  {ext:<8} {n}")
    print()

    if not code_files:
        print("No code files found. Nothing to build.")
        return 0

    # -- 2. run AST extraction (deterministic, no LLM) -------------------
    t0 = time.perf_counter()
    extraction = extract(code_files)
    t_extract = time.perf_counter() - t0
    n_nodes = len(extraction.get("nodes", []))
    n_edges = len(extraction.get("edges", []))
    print(f"AST extraction: {n_nodes} nodes, {n_edges} edges in {t_extract:.2f}s")
    print(f"  input_tokens:  {extraction.get('input_tokens', 0)}  (AST = 0 expected)")
    print(f"  output_tokens: {extraction.get('output_tokens', 0)}  (AST = 0 expected)")
    print()

    # -- 3. build NetworkX graph -----------------------------------------
    t0 = time.perf_counter()
    G = build([extraction], directed=args.directed)
    t_build = time.perf_counter() - t0
    print(f"Graph built in {t_build:.2f}s: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
    print()

    # -- 4. serialize to graph.json ---------------------------------------
    # `graphify query` and `graphify benchmark` both call
    # json_graph.node_link_graph(data, edges="links") — so graph.json MUST
    # be the NetworkX node-link format with the literal "links" key (not
    # "edges"). This matches what graphify.export writes natively.
    t0 = time.perf_counter()

    graph_path = out_dir / "graph.json"
    nl = json_graph.node_link_data(G, edges="links")
    graph_path.write_text(json.dumps(nl, indent=2), encoding="utf-8")

    # Also dump the raw extraction dict for debugging / future tooling.
    raw_path = out_dir / "graph_raw.json"
    raw_path.write_text(json.dumps(extraction, indent=2), encoding="utf-8")

    t_write = time.perf_counter() - t0
    graph_size = graph_path.stat().st_size
    raw_size = raw_path.stat().st_size
    print(f"Wrote:")
    print(f"  {graph_path}  ({format_bytes(graph_size)}) — for `graphify query` / `benchmark`")
    print(f"  {raw_path}  ({format_bytes(raw_size)}) — raw extraction dict (debug)")
    print(f"  write time: {t_write:.2f}s")
    print()

    # -- 5. post-build secret sweep --------------------------------------
    print("Running post-build secret sweep on graph files...")
    hits: list[tuple[str, str]] = []
    for p in (graph_path, raw_path):
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        for m in SECRET_SWEEP.finditer(text):
            hits.append((str(p), m.group(0)[:30]))
            if len(hits) >= 5:
                break
    if hits:
        print("  !!! SECRET PATTERNS DETECTED !!!", file=sys.stderr)
        for path, match in hits:
            print(f"    {path}: {match}...", file=sys.stderr)
        print("  Inspect the files above and delete out/ before using this graph.", file=sys.stderr)
        return 2
    print("  OK — no secret patterns found.")
    print()

    # -- 6. summary ------------------------------------------------------
    print("=" * 72)
    print("Build complete. Next steps:")
    print("=" * 72)
    print(f"  # Query the graph (BFS, budget 2000 tokens):")
    print(f"  graphify query '<your question>' --graph {graph_path}")
    print()
    print(f"  # Measure token reduction vs naive full-corpus:")
    print(f"  graphify benchmark {graph_path}")
    print()
    print("REMINDER: sandbox experiment only. Do NOT run `graphify claude install`")
    print("or `graphify hook install` — those write persistent hooks into your repo.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
