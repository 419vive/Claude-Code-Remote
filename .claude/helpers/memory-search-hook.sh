#!/usr/bin/env bash
# memory-search-hook.sh — UserPromptSubmit hook
#
# When the user prompt contains memory-trigger keywords (Chinese or English),
# this hook prints the most relevant excerpts from docs/PROJECT_JOURNAL.md so
# Claude Code injects them into context as a <system-reminder>.
#
# Defensive contract:
#   - Read JSON from stdin: {"prompt": "..."}
#   - On any error (missing jq, missing file, regex fail): exit 0 with no output
#   - Cap output at ~50 lines / ~3KB to keep context impact bounded
#   - Skip silently when no trigger keywords match (most prompts shouldn't fire)
#
# This complements the @docs/PROJECT_JOURNAL.md auto-import in CLAUDE.md
# (PR #93): the @ import handles SessionStart, this hook handles mid-session
# memory-recall queries that arrive after the journal context was compacted out.

set +e  # NEVER fail — hooks must exit 0

# ------------------------------------------------------------
# Resolve repo root (handles worktrees and CLAUDE_PROJECT_DIR)
# ------------------------------------------------------------
ROOT="${CLAUDE_PROJECT_DIR:-}"
if [ -z "$ROOT" ]; then
  ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." 2>/dev/null && pwd)"
fi
JOURNAL="$ROOT/docs/PROJECT_JOURNAL.md"

# Bail if journal not found
[ -f "$JOURNAL" ] || exit 0

# ------------------------------------------------------------
# Read prompt from stdin (JSON), fall back to empty on parse error
# ------------------------------------------------------------
PROMPT=""
if command -v jq >/dev/null 2>&1; then
  STDIN_DATA="$(cat 2>/dev/null || true)"
  PROMPT="$(printf '%s' "$STDIN_DATA" | jq -r '.prompt // empty' 2>/dev/null || true)"
fi

# Empty prompt → nothing to do
[ -n "$PROMPT" ] || exit 0

# ------------------------------------------------------------
# Trigger keyword regex (Chinese + English memory-recall phrases)
# ------------------------------------------------------------
TRIGGERS='之前|上次|有沒有|曾經|先前|決定過|為什麼|怎麼|before|did we|how did we|why did we|decided|previously|remember|recall|last time'

# Skip silently when prompt has no trigger keywords
echo "$PROMPT" | grep -Eqi "$TRIGGERS" || exit 0

# ------------------------------------------------------------
# Extract distinctive content words for grep search.
# Strategy: tokenize, drop trigger words and stopwords, take top 5.
# ------------------------------------------------------------
WORDS="$(echo "$PROMPT" \
  | tr '[:upper:]' '[:lower:]' \
  | tr -c '[:alnum:]\n\300-\377' ' ' \
  | tr -s ' ' '\n' \
  | grep -Ev '^(the|and|for|with|that|this|from|have|been|did|we|you|me|to|a|of|in|on|is|it|at|or|but|as|by|an|do|does|how|why|when|what|which|previously|before|decided|remember|recall|之前|上次|有沒有|曾經|先前|決定過|為什麼|怎麼)$' \
  | grep -E '.{2,}' \
  | head -5 \
  | tr '\n' '|' \
  | sed 's/|$//')"

# ------------------------------------------------------------
# Build excerpt: prefer matches against extracted content words.
# If no content words, fall back to top journal entry.
# ------------------------------------------------------------
EXCERPT=""
if [ -n "$WORDS" ]; then
  EXCERPT="$(grep -B 2 -A 30 -m 3 -iE "$WORDS" "$JOURNAL" 2>/dev/null | head -50)"
fi

# Fallback: top journal entry header + first 30 lines of body
if [ -z "$EXCERPT" ]; then
  EXCERPT="$(awk '/^## [0-9]{4}-[0-9]{2}-[0-9]{2}/{c++} c==1{print; if(NR>40) exit}' "$JOURNAL" 2>/dev/null | head -32)"
fi

# Still nothing → silent exit
[ -n "$EXCERPT" ] || exit 0

# ------------------------------------------------------------
# Output: prefix + capped excerpt
# ------------------------------------------------------------
echo "[Memory] Relevant journal excerpts (auto-injected):"
echo "$EXCERPT" | head -50

exit 0
