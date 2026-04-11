#!/usr/bin/env bash
# graphifyy sandbox — thin wrapper that activates the venv and runs
# build_ast_graph.py. All real logic lives in the Python driver; this
# script exists so `bash build_graph.sh` just works without needing to
# remember the venv activation.
#
# What the Python driver does:
#   - walks the repo with our own exclude list (excludes .claude/, .env,
#     node_modules, binaries, lock files, etc.)
#   - calls graphify.extract.extract() for AST-only extraction (deterministic,
#     zero LLM cost) — does NOT touch docs/images/video.
#   - writes out/graph.json + out/graph_networkx.json
#   - runs a post-build secret sweep on the serialized graph.
#
# To actually query the built graph:
#   source scripts/graphify-sandbox/.venv/bin/activate
#   graphify query "<your question>" --graph scripts/graphify-sandbox/out/graph.json
#
# DO NOT RUN:
#   graphify claude install     # writes PreToolUse hook + CLAUDE.md section
#   graphify hook install       # writes post-commit + post-checkout git hooks
#   graphify install            # same as 'graphify claude install'
# These are the agent-runtime integration paths we're deliberately NOT using.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -d "$SCRIPT_DIR/.venv" ]; then
  echo "ERROR: venv not found. Run: bash $SCRIPT_DIR/setup.sh" >&2
  exit 1
fi
# shellcheck disable=SC1091
source "$SCRIPT_DIR/.venv/bin/activate"

exec python "$SCRIPT_DIR/build_ast_graph.py" "$@"
