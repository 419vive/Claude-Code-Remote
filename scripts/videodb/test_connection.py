#!/usr/bin/env python3
"""VideoDB Connection Test"""
import os, sys
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

def main():
    print("VideoDB Connection Test")
    print("=" * 40)
    api_key = os.environ.get("VIDEO_DB_API_KEY")
    if not api_key:
        print("ERROR: VIDEO_DB_API_KEY not set in .env")
        sys.exit(1)
    print(f"API Key: {api_key[:8]}...{api_key[-4:]}")
    try:
        from videodb import connect
        conn = connect(api_key=api_key)
        coll = conn.get_collection()
        print(f"Connected! Collection ID: {coll.id}")
        videos = coll.get_videos()
        print(f"Videos in collection: {len(videos)}")
        print("All good! VideoDB is configured correctly.")
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
