# VideoDB Setup — Kunjia Autos AI Chatbot

## Overview
VideoDB provides AI-powered video infrastructure for the dealership's vehicle videos. It enables transcription, semantic search, timeline editing, and streaming.

**Use cases for Kunjia Autos:**
- Transcribe vehicle walkthrough videos (Mandarin/English)
- Semantic search across all videos (e.g., "which car has leather seats?")
- Auto-generate highlight clips from full walkthroughs
- Index video content for the AI chatbot to reference

## Account Details
- **Console:** https://console.videodb.io
- **Auth:** GitHub (419vive)
- **Plan:** Free tier — 50 uploads, no credit card required
- **Created:** April 2, 2026

## Free Tier Includes
| Feature              | Limit           |
|----------------------|-----------------|
| Video uploads        | 50              |
| Transcription        | Included        |
| Semantic search      | Included        |
| Timeline editing     | Included        |
| Streaming            | Included        |
| API access           | Full            |

## Configuration

### 1. Set your API key
Copy `.env.example` to `.env` and add your real key:
```bash
cp .env.example .env
```
Then edit `.env` and set `VIDEO_DB_API_KEY` to your key from console.videodb.io.

> **Never commit `.env` to git.** The `.gitignore` is already configured to exclude it.

### 2. Install the Python SDK
```bash
pip install -r scripts/videodb/requirements.txt
```

### 3. Test the connection
```bash
python scripts/videodb/test_connection.py
```

## Quick Start — Upload & Search a Video
```python
import os
from videodb import connect

conn = connect(api_key=os.environ["VIDEO_DB_API_KEY"])
coll = conn.get_collection()

video = coll.upload(url="https://example.com/2024-toyota-camry-walkthrough.mp4")
video.index_spoken_words()

results = coll.search("leather seats")
for r in results.get_shots():
    print(f"Found at {r.start:.1f}s - {r.end:.1f}s: {r.text}")
```

## API Reference
- **Docs:** https://docs.videodb.io
- **Python SDK:** https://github.com/video-db/videodb-python
- **Node.js SDK:** https://github.com/video-db/videodb-node
