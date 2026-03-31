#!/bin/bash
# save-audit-skill.sh
# Saves GEO/SEO audit findings as an OpenSpace skill for future reference
# Usage: ./save-audit-skill.sh "issue-title" "summary-of-findings"

set -euo pipefail

SKILL_DIR="/tmp/geo-seo-skill-$(date +%Y%m%d)"
mkdir -p "$SKILL_DIR"

TITLE="${1:-GEO/SEO Audit Findings}"
SUMMARY="${2:-No summary provided}"
DATE=$(date +%Y-%m-%d)

# Create skill definition
cat > "$SKILL_DIR/skill.json" <<EOF
{
  "name": "geo-seo-audit-${DATE}",
  "description": "GEO/SEO audit findings and recommended fixes for 崑家汽車",
  "tags": ["seo", "geo", "audit", "kunjia-autos", "schema-markup"],
  "version": "1.0.0",
  "created": "${DATE}"
}
EOF

# Create the skill content (the reusable knowledge)
cat > "$SKILL_DIR/README.md" <<EOF
# ${TITLE}

**Date:** ${DATE}
**Site:** 崑家汽車 (kunjia-autos.com)

## Findings Summary

${SUMMARY}

## Reusable Patterns

### Schema Fixes
- Always include Person schema for founder (賴崑家) for E-E-A-T
- ServiceChannel schema for 左營高鐵站 on out-of-city pages
- AutoDealer schema with full sameAs array (Google Business Profile)

### AI Citability
- Use \`data-ai-summary="true"\` blocks with structured <dl> content
- Include PAA-targeted FAQ sections (8+ per area page)
- Keep answer-summary blocks under 300 chars for snippet extraction

### Core Web Vitals Targets
- FCP < 1.8s, LCP < 2.5s, CLS < 0.1
- Lazy-load images below fold
- Preload critical fonts and hero images

### Competitor Benchmarks
- HOT大聯盟: National chain, strong branded search
- SUM優質車商: Franchise model, many local pages
- 崑家 advantage: Local trust, founder story, HSR pickup service
EOF

# Upload to OpenSpace if available
if command -v openspace-upload-skill &> /dev/null; then
  echo "Uploading skill to OpenSpace..."
  openspace-upload-skill --skill-dir "$SKILL_DIR" \
    --visibility private \
    --origin captured \
    2>&1 || echo "OpenSpace upload failed (may need auth). Skill saved locally at: $SKILL_DIR"
else
  echo "OpenSpace CLI not found. Skill saved locally at: $SKILL_DIR"
  echo "To upload manually, run:"
  echo "  cd ~/OpenSpace && source .venv/bin/activate"
  echo "  openspace-upload-skill --skill-dir $SKILL_DIR --visibility private --origin captured"
fi

echo ""
echo "✅ Skill saved: $SKILL_DIR"
