#!/usr/bin/env python3
"""Upload & Index a Vehicle Video"""
import os, sys
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

def main():
    if len(sys.argv) < 2:
        print("Usage: python upload_vehicle.py <video_url_or_path>")
        sys.exit(1)
    video_source = sys.argv[1]
    api_key = os.environ.get("VIDEO_DB_API_KEY")
    if not api_key:
        print("ERROR: VIDEO_DB_API_KEY not set in .env")
        sys.exit(1)
    from videodb import connect
    conn = connect(api_key=api_key)
    coll = conn.get_collection()
    print(f"Uploading: {video_source}")
    if video_source.startswith("http"):
        video = coll.upload(url=video_source)
    else:
        video = coll.upload(file_path=video_source)
    print(f"Uploaded: {video.name} (ID: {video.id})")
    print("Indexing spoken words...")
    video.index_spoken_words()
    print("Done! Video is now searchable.")
    stream_url = video.generate_stream()
    print(f"Stream URL: {stream_url}")

if __name__ == "__main__":
    main()
