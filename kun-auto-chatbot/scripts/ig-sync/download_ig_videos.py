#!/usr/bin/env python3
"""
download_ig_videos.py — Phase 1 IG video fetcher for @mrlai_gogoya.

Strategy: yt-dlp public-post scrape. Used as POC + fallback for Phase 2
(official Instagram Graph API). Phase-1 limitations are documented in
scripts/ig-sync/README.md.

Caveats (READ BEFORE RUNNING):
  * Instagram TOS prohibits automated scraping. Use sparingly, throttle
    aggressively. If Instagram flags the source account, switch to Graph API.
  * Only works on public profiles. @mrlai_gogoya is currently public.
  * Output is raw .mp4 + .json metadata — no DB writes happen here.
    Use match_to_vehicle.ts afterwards to link videos to vehicle rows.

Usage:
  python download_ig_videos.py                        # default profile + last 30 posts
  python download_ig_videos.py --limit 5              # only 5 most recent
  python download_ig_videos.py --profile other_handle
  python download_ig_videos.py --since 2026-03-01     # posts on/after this date
  python download_ig_videos.py --dry-run              # list only, don't download

Outputs to: scripts/ig-sync/ig-raw/<shortcode>.mp4 + .info.json
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_PROFILE = "mrlai_gogoya"
DEFAULT_LIMIT = 30
THROTTLE_SECONDS = 3  # be nice to IG; don't get flagged
OUTPUT_DIR = Path(__file__).parent / "ig-raw"


def check_yt_dlp() -> str:
    """Return path to yt-dlp or exit with install instructions."""
    path = shutil.which("yt-dlp")
    if path:
        return path
    print("ERROR: yt-dlp not found on PATH.", file=sys.stderr)
    print("Install with one of:", file=sys.stderr)
    print("  pipx install yt-dlp        # preferred", file=sys.stderr)
    print("  pip install --user yt-dlp", file=sys.stderr)
    print("  brew install yt-dlp        # macOS", file=sys.stderr)
    sys.exit(1)


def iso_date(s: str) -> datetime:
    return datetime.strptime(s, "%Y-%m-%d").replace(tzinfo=timezone.utc)


def list_posts(yt_dlp: str, profile: str, limit: int) -> list[dict]:
    """Fetch post metadata only (no downloads)."""
    url = f"https://www.instagram.com/{profile}/"
    cmd = [
        yt_dlp,
        "--dump-json",
        "--flat-playlist",
        "--playlist-end",
        str(limit),
        "--no-warnings",
        url,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    except subprocess.CalledProcessError as e:
        print(f"ERROR: yt-dlp listing failed (code {e.returncode}).", file=sys.stderr)
        print(f"stderr: {e.stderr}", file=sys.stderr)
        print(
            "Common causes: Instagram rate-limited the IP, profile is private, "
            "or yt-dlp is out of date. Try `yt-dlp -U`.",
            file=sys.stderr,
        )
        sys.exit(2)

    posts = []
    for line in result.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            posts.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return posts


def is_video(post: dict) -> bool:
    # yt-dlp flat-playlist marks videos distinctly from images via ie_key/type
    return (
        post.get("ie_key") == "Instagram"
        or post.get("_type") in {"url", "video"}
    ) and post.get("id")


def already_downloaded(shortcode: str) -> bool:
    return (OUTPUT_DIR / f"{shortcode}.mp4").exists()


def download_single(yt_dlp: str, post_url: str, shortcode: str) -> bool:
    """Download a single post. Returns True on success."""
    out_template = str(OUTPUT_DIR / f"{shortcode}.%(ext)s")
    cmd = [
        yt_dlp,
        "--write-info-json",
        "--no-warnings",
        "-o",
        out_template,
        post_url,
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"  FAILED ({shortcode}): {e.stderr.strip().splitlines()[-1] if e.stderr else 'unknown'}", file=sys.stderr)
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--profile", default=DEFAULT_PROFILE, help=f"IG handle (default: {DEFAULT_PROFILE})")
    parser.add_argument("--limit", type=int, default=DEFAULT_LIMIT, help=f"Max posts to consider (default: {DEFAULT_LIMIT})")
    parser.add_argument("--since", type=iso_date, default=None, help="Only posts on/after YYYY-MM-DD")
    parser.add_argument("--dry-run", action="store_true", help="List but don't download")
    args = parser.parse_args()

    yt_dlp = check_yt_dlp()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Fetching up to {args.limit} posts from @{args.profile}...")
    posts = list_posts(yt_dlp, args.profile, args.limit)
    print(f"Found {len(posts)} entries.")

    to_download = []
    for post in posts:
        if not is_video(post):
            continue
        shortcode = post.get("id") or post.get("display_id")
        if not shortcode:
            continue
        if args.since:
            ts = post.get("timestamp") or post.get("upload_date")
            if ts:
                post_dt = (
                    datetime.fromtimestamp(int(ts), tz=timezone.utc)
                    if isinstance(ts, (int, float)) or (isinstance(ts, str) and ts.isdigit())
                    else None
                )
                if post_dt and post_dt < args.since:
                    continue
        if already_downloaded(shortcode):
            print(f"  SKIP {shortcode} (already downloaded)")
            continue
        to_download.append(post)

    print(f"Queued {len(to_download)} videos.")
    if args.dry_run:
        for p in to_download:
            print(f"  DRY-RUN {p.get('id')}: {p.get('title', '')[:60]}")
        return

    ok = 0
    for i, post in enumerate(to_download, 1):
        shortcode = post["id"]
        post_url = post.get("url") or f"https://www.instagram.com/p/{shortcode}/"
        print(f"[{i}/{len(to_download)}] Downloading {shortcode}...")
        if download_single(yt_dlp, post_url, shortcode):
            ok += 1
            print(f"  OK -> {OUTPUT_DIR / (shortcode + '.mp4')}")
        # Throttle regardless of success
        if i < len(to_download):
            time.sleep(THROTTLE_SECONDS)

    print(f"\nDone. {ok}/{len(to_download)} downloaded into {OUTPUT_DIR}/")
    print("Next: run scripts/ig-sync/match_to_vehicle.ts to link videos to DB rows.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nAborted.", file=sys.stderr)
        sys.exit(130)
