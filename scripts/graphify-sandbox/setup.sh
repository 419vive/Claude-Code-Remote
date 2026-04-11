#!/usr/bin/env bash
# graphifyy sandbox — one-shot setup for the graphify knowledge-graph tool.
#
# WHY A SANDBOX:
#   graphifyy is a very new PyPI package (first release 2026-04-04, maintainer
#   "captainturbo", no real-name identity, 50 releases in first week). We
#   deliberately isolate it from the rest of the repo:
#     - standalone venv at scripts/graphify-sandbox/.venv (not the project venv)
#     - PINNED version (see PINNED_VERSION below) — no floating latest
#     - NO Claude Code skill install (do NOT run `claude skill install`)
#     - NO PreToolUse hook wiring
#     - explicit secret-exclusion lists enforced in build_graph.sh
#
#   Treat this as an EXPERIMENT. If the experiment fails or graphifyy turns
#   out to be abandoned / compromised, delete scripts/graphify-sandbox/ and
#   the venv — nothing else in the repo depends on it.

set -euo pipefail

# Pin the version you audited. Bump only after re-reviewing release notes
# AND re-running `pip install --dry-run` to confirm dependency tree.
PINNED_VERSION="0.4.2"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 not found. Install Python 3.10+ first." >&2
  exit 1
fi

echo "[1/4] Creating Python venv at $SCRIPT_DIR/.venv ..."
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

echo "[2/4] Upgrading pip ..."
pip install --upgrade pip

echo "[3/4] Installing graphifyy==$PINNED_VERSION (pinned) ..."
pip install "graphifyy==$PINNED_VERSION"

echo "[4/4] Verifying install ..."
INSTALLED_VERSION="$(pip show graphifyy 2>/dev/null | awk '/^Version:/ {print $2}')"
if [ "$INSTALLED_VERSION" != "$PINNED_VERSION" ]; then
  echo "ERROR: expected graphifyy $PINNED_VERSION, got $INSTALLED_VERSION" >&2
  exit 1
fi

# Locate the CLI binary — the package may expose `graphify`, `graphifyy`, or both.
CLI_BIN=""
for candidate in graphifyy graphify; do
  if command -v "$candidate" >/dev/null 2>&1; then
    CLI_BIN="$candidate"
    break
  fi
done

if [ -z "$CLI_BIN" ]; then
  echo "WARNING: graphifyy installed but no CLI binary on PATH."
  echo "  Expected one of: graphifyy, graphify"
  echo "  Check: pip show -f graphifyy | grep bin"
else
  echo "  CLI binary: $CLI_BIN"
  echo "  Version:    $("$CLI_BIN" --version 2>/dev/null || echo '(no --version flag)')"
fi

cat <<'EOF'

Setup complete.

NEXT STEP:
  bash scripts/graphify-sandbox/build_graph.sh --dry-run

This prints the exact command that WOULD run against the repo, along with
the full exclude list. Review it before running without --dry-run.

SAFETY REMINDERS:
  - graphifyy is 7+ days old at first install. Treat as experimental.
  - DO NOT `claude skill install` graphify or enable any PreToolUse hook.
  - DO NOT commit files from .venv/, out/, graph/, runs/ (see .gitignore).
  - If build_graph.sh crashes, inspect out/ for partial graph JSON and
    `grep -rE '(sk-|xoxb-|ghp_|AKIA|BEGIN PRIVATE KEY)' out/` before reuse.

EOF
