#!/usr/bin/env python3
"""
generate_voices.py — Multi-speaker TTS for Kunjia podcast episodes using Gemini 2.5 TTS.

Reads scripts/podcast/episodes/<ep>/script.json, generates one WAV per
line of dialogue using the speaker's voice, and writes a timing manifest
the Remotion renderer consumes.

Why per-line (not one big multi-speaker blob)?
  * Exact duration per line -> precise subtitle sync in Remotion
  * Cheap retry when one line sounds wrong (regenerate that line only)
  * Enables per-speaker volume / EQ tweaks downstream

Usage:
  python scripts/podcast/generate_voices.py ep01-road-rage
  python scripts/podcast/generate_voices.py ep01-road-rage --dry-run
  python scripts/podcast/generate_voices.py ep01-road-rage --only 12      # regen line 12 only
  python scripts/podcast/generate_voices.py ep01-road-rage --model gemini-2.5-pro-preview-tts

Requires:
  GEMINI_API_KEY env var (already configured in the project)
  pip install google-genai soundfile

Output:
  scripts/podcast/episodes/<ep>/voices/NNNN-<speaker>.wav   (per-line audio)
  scripts/podcast/episodes/<ep>/voices/timing.json           (cumulative timeline)
"""
from __future__ import annotations

import argparse
import json
import os
import struct
import sys
import time
import wave
from pathlib import Path

DEFAULT_MODEL = "gemini-2.5-flash-preview-tts"  # flash = cheap; swap to -pro for better prosody
GAP_MS_AFTER_LINE = 180  # natural pause between turns
SAMPLE_RATE = 24000      # Gemini TTS default


def load_script(ep_dir: Path) -> dict:
    script_path = ep_dir / "script.json"
    if not script_path.exists():
        print(f"ERROR: {script_path} not found", file=sys.stderr)
        sys.exit(1)
    return json.loads(script_path.read_text(encoding="utf-8"))


def flatten_lines(script: dict) -> list[dict]:
    out = []
    for chapter in script["chapters"]:
        for line in chapter["lines"]:
            out.append({
                "chapterId": chapter["id"],
                "chapterTitle": chapter["title"],
                "speaker": line["speaker"],
                "text": line["text"],
                "estSec": line.get("estSec", 5),
            })
    return out


def pcm_duration_ms(wav_path: Path) -> int:
    with wave.open(str(wav_path), "rb") as f:
        frames = f.getnframes()
        rate = f.getframerate()
        return int(round(frames / rate * 1000))


def save_pcm_as_wav(pcm_bytes: bytes, out_path: Path, sample_rate: int = SAMPLE_RATE) -> None:
    """Gemini returns raw 16-bit PCM. Wrap it in a proper WAV header."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(out_path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(pcm_bytes)


def synthesize_line(client, model: str, text: str, voice_name: str) -> bytes:
    """Call Gemini TTS for a single line, return raw PCM bytes."""
    from google.genai import types  # type: ignore

    response = client.models.generate_content(
        model=model,
        contents=text,
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice_name)
                )
            ),
        ),
    )
    # PCM sits inside inline_data of the first audio part
    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.data:
            return part.inline_data.data
    raise RuntimeError("Gemini TTS response contained no audio data")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("episode", help="Episode id, e.g. ep01-road-rage")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--only", type=int, help="Regenerate only this line index (0-based)")
    parser.add_argument("--dry-run", action="store_true", help="Print plan, call no API")
    parser.add_argument("--force", action="store_true", help="Overwrite existing WAVs")
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not set (or GOOGLE_API_KEY). See docs/PODCAST-STUDIO.md", file=sys.stderr)
        sys.exit(1)

    repo_root = Path(__file__).resolve().parents[2]
    ep_dir = repo_root / "scripts" / "podcast" / "episodes" / args.episode
    voices_dir = ep_dir / "voices"
    voices_dir.mkdir(parents=True, exist_ok=True)

    script = load_script(ep_dir)
    lines = flatten_lines(script)
    hosts = script["hosts"]

    print(f"Episode: {script['title']}")
    print(f"Lines:   {len(lines)}")
    print(f"Model:   {args.model}")
    print(f"Output:  {voices_dir}/")
    print()

    if args.dry_run:
        for i, line in enumerate(lines):
            speaker = hosts[line["speaker"]]["name"]
            voice = hosts[line["speaker"]]["voiceName"]
            print(f"  [{i:03d}] {speaker} ({voice}): {line['text'][:50]}...  (~{line['estSec']}s)")
        return

    from google import genai  # type: ignore
    client = genai.Client(api_key=api_key)

    timing: list[dict] = []
    cursor_ms = 0
    total_api_chars = 0
    start_time = time.time()

    for i, line in enumerate(lines):
        if args.only is not None and i != args.only:
            # Preserve prior audio; read its duration to keep the timeline correct
            prior = voices_dir / f"{i:03d}-{line['speaker']}.wav"
            if prior.exists():
                dur_ms = pcm_duration_ms(prior)
                timing.append({
                    "index": i,
                    "speaker": line["speaker"],
                    "speakerName": hosts[line["speaker"]]["name"],
                    "text": line["text"],
                    "wav": prior.name,
                    "startMs": cursor_ms,
                    "durationMs": dur_ms,
                    "chapterId": line["chapterId"],
                })
                cursor_ms += dur_ms + GAP_MS_AFTER_LINE
            continue

        out_path = voices_dir / f"{i:03d}-{line['speaker']}.wav"
        if out_path.exists() and not args.force:
            dur_ms = pcm_duration_ms(out_path)
            print(f"  [{i:03d}] SKIP (exists)  {line['speaker']}: {line['text'][:40]}...")
        else:
            voice_name = hosts[line["speaker"]]["voiceName"]
            print(f"  [{i:03d}] GEN    {line['speaker']} ({voice_name}): {line['text'][:40]}...")
            try:
                pcm = synthesize_line(client, args.model, line["text"], voice_name)
            except Exception as e:
                print(f"    FAILED: {e}", file=sys.stderr)
                print(f"    Retrying in 5s...", file=sys.stderr)
                time.sleep(5)
                pcm = synthesize_line(client, args.model, line["text"], voice_name)
            save_pcm_as_wav(pcm, out_path)
            dur_ms = pcm_duration_ms(out_path)
            total_api_chars += len(line["text"])

        timing.append({
            "index": i,
            "speaker": line["speaker"],
            "speakerName": hosts[line["speaker"]]["name"],
            "text": line["text"],
            "wav": out_path.name,
            "startMs": cursor_ms,
            "durationMs": dur_ms,
            "chapterId": line["chapterId"],
        })
        cursor_ms += dur_ms + GAP_MS_AFTER_LINE

    (voices_dir / "timing.json").write_text(
        json.dumps({
            "episodeId": script["episodeId"],
            "model": args.model,
            "sampleRate": SAMPLE_RATE,
            "totalDurationMs": cursor_ms,
            "totalDurationSec": round(cursor_ms / 1000, 1),
            "gapMsBetweenLines": GAP_MS_AFTER_LINE,
            "lines": timing,
        }, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    elapsed = time.time() - start_time
    print()
    print(f"Done in {elapsed:.1f}s.")
    print(f"Total audio: {cursor_ms / 1000:.1f}s")
    print(f"Chars sent to API this run: {total_api_chars}")
    print(f"Timing manifest: {voices_dir / 'timing.json'}")
    print()
    print("Next: npx tsx scripts/podcast/render-podcast.ts", args.episode)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nAborted.", file=sys.stderr)
        sys.exit(130)
