#!/usr/bin/env bash
# TRIBE v2 Personal Research Sandbox — one-shot setup.
#
# Creates an isolated Python venv in scripts/tribe-sandbox/.venv,
# clones facebookresearch/tribev2, and installs inference + plotting deps.
#
# LICENSE: TRIBE v2 is CC-BY-NC-4.0. Outputs from this sandbox may NOT
# be used to drive commercial advertising or content decisions for
# 崑家汽車 or any other commercial entity. Personal research only.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 not found. Install Python 3.10+ first." >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git not found." >&2
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

echo "[3/4] Cloning facebookresearch/tribev2 (if absent) ..."
if [ ! -d tribev2 ]; then
  git clone https://github.com/facebookresearch/tribev2.git
fi
pip install -e ./tribev2

echo "[4/4] Installing sandbox visualization deps ..."
pip install "nilearn>=0.10" "matplotlib>=3.7" "numpy>=1.26"

cat <<'EOF'

Setup complete.

To use:
  source scripts/tribe-sandbox/.venv/bin/activate
  python scripts/tribe-sandbox/run_preflight.py --video path/to/ad.mp4

REMINDER: CC-BY-NC-4.0 — personal research only.
Do NOT use outputs to drive commercial ad/content decisions for 崑家汽車.
EOF
