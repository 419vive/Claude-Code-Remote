#!/usr/bin/env python3
"""
generate_portraits.py — Generate realistic character portraits for podcast hosts via Gemini.

Uses the existing GEMINI_API_KEY to generate host portraits matching the persona
defined in script.json. Output goes to public/podcast/portraits/<speaker>.png so
the Remotion composition can reference it as `staticFile('podcast/portraits/kai.png')`.

After running, update scripts/podcast/episodes/<ep>/script.json to set:
    "hosts.kai.portraitUrl": "/podcast/portraits/kai.png"
    "hosts.wen.portraitUrl": "/podcast/portraits/wen.png"
(leading slash = served by Vite/dev server from public/)

Usage:
  python scripts/podcast/generate_portraits.py ep01-road-rage
  python scripts/podcast/generate_portraits.py ep01-road-rage --style "photorealistic studio headshot"
  python scripts/podcast/generate_portraits.py ep01-road-rage --only kai

Requires:
  GEMINI_API_KEY env var
  pip install google-genai
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

DEFAULT_STYLE = "photorealistic professional podcast host portrait, natural studio lighting, soft background, warm tone, shoulders-up, neutral expression with slight smile, taiwan"


def build_prompt(persona_text: str, gender: str, style: str) -> str:
    # Kept simple and descriptive — avoids ethnic-stereotype phrasing while still
    # rendering plausibly Taiwanese. Gender hint is explicit but neutral.
    gender_hint = "a Taiwanese woman, 30s, warm expression" if gender == "female" else "a Taiwanese man, mid-30s, thoughtful expression"
    return (
        f"{style}, {gender_hint}, character backstory: {persona_text}, "
        f"4k detail, shot on 85mm lens, f/2.8, high quality"
    )


def save_image(image_bytes: bytes, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(image_bytes)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("episode", help="Episode id, e.g. ep01-road-rage")
    parser.add_argument("--style", default=DEFAULT_STYLE)
    parser.add_argument("--only", choices=["kai", "wen"], help="Generate only one speaker")
    parser.add_argument("--model", default="gemini-2.5-flash-image")
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not set", file=sys.stderr)
        sys.exit(1)

    repo_root = Path(__file__).resolve().parents[2]
    ep_dir = repo_root / "scripts" / "podcast" / "episodes" / args.episode
    script = json.loads((ep_dir / "script.json").read_text(encoding="utf-8"))

    out_dir = repo_root / "public" / "podcast" / "portraits"
    out_dir.mkdir(parents=True, exist_ok=True)

    from google import genai
    from google.genai import types
    client = genai.Client(api_key=api_key)

    for speaker_key in ("kai", "wen"):
        if args.only and speaker_key != args.only:
            continue
        host = script["hosts"][speaker_key]
        prompt = build_prompt(host["persona"], host["gender"], args.style)
        print(f"Generating {host['name']} ({speaker_key})...")
        print(f"  Prompt: {prompt[:100]}...")

        resp = client.models.generate_content(
            model=args.model,
            contents=prompt,
            config=types.GenerateContentConfig(response_modalities=["IMAGE"]),
        )

        saved = False
        for part in resp.candidates[0].content.parts:
            if part.inline_data and part.inline_data.data:
                out_path = out_dir / f"{speaker_key}.png"
                save_image(part.inline_data.data, out_path)
                print(f"  Saved -> {out_path}")
                saved = True
                break
        if not saved:
            print(f"  WARNING: no image in response for {speaker_key}", file=sys.stderr)

    print()
    print("Remember to update script.json with portraitUrl for each host:")
    print('  "portraitUrl": "/podcast/portraits/kai.png"')


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nAborted.", file=sys.stderr)
        sys.exit(130)
