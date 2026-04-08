#!/usr/bin/env python3
"""Fetch 104.com.tw job details via the public AJAX endpoint.

Business integration proof-of-concept: pulls structured job data from Taiwan's
largest job board (104) so downstream Claude agents (Claude Code, Claude for
Chrome, Claude cowork) can reason over real JD content instead of placeholders.

Input:  JOB_IDS env var (space or comma separated) OR scripts/104_ids.txt
Output: data/jobs-104/<id>.json (raw) + data/jobs-104/summary.json + jobs.md
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import requests

OUT_DIR = Path("data/jobs-104")
OUT_DIR.mkdir(parents=True, exist_ok=True)

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)


def fetch_one(job_id: str) -> dict[str, Any] | None:
    url = f"https://www.104.com.tw/job/ajax/content/{job_id}"
    headers = {
        "User-Agent": UA,
        "Referer": f"https://www.104.com.tw/job/{job_id}",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
    }
    try:
        r = requests.get(url, headers=headers, timeout=20)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"  [FAIL] {job_id}: {e}")
        return None


def extract_summary(data: dict[str, Any]) -> dict[str, Any]:
    d = data.get("data", {}) or {}
    header = d.get("header", {}) or {}
    cond = d.get("condition", {}) or {}
    job_detail = d.get("jobDetail", {}) or {}
    welfare = d.get("welfare", {}) or {}
    return {
        "job_name": header.get("jobName"),
        "company": header.get("custName"),
        "applied": header.get("applyCnt"),
        "location": job_detail.get("addressRegion"),
        "salary": job_detail.get("salary"),
        "work_type": job_detail.get("workType"),
        "work_period": job_detail.get("workPeriod"),
        "manage_responsibility": job_detail.get("manageResponsibility"),
        "job_description": job_detail.get("jobDescription"),
        "other_requirement": job_detail.get("otherRequirement"),
        "required_experience": cond.get("workExp"),
        "required_education": cond.get("edu"),
        "required_language": cond.get("language"),
        "required_skills": cond.get("specialty"),
        "required_tools": cond.get("skill"),
        "accept_role": cond.get("acceptRole"),
        "other_spec": cond.get("other"),
        "welfare": welfare.get("welfare"),
    }


def render_md(summaries: list[dict[str, Any]]) -> str:
    lines = ["# 104 Job Intelligence Report", ""]
    for s in summaries:
        if "error" in s:
            lines.append(f"## ❌ {s['id']} — FETCH FAILED ({s.get('error')})\n")
            continue
        lines.append(
            f"## {s.get('job_name') or '(unknown)'} | "
            f"{s.get('company') or ''}"
        )
        lines.append(
            f"- **ID:** `{s['id']}` — "
            f"https://www.104.com.tw/job/{s['id']}"
        )
        lines.append(f"- **地點:** {s.get('location') or '-'}")
        lines.append(f"- **薪資:** {s.get('salary') or '-'}")
        lines.append(f"- **工作型態:** {s.get('work_type') or '-'}")
        lines.append(f"- **經驗:** {s.get('required_experience') or '-'}")
        lines.append(f"- **學歷:** {s.get('required_education') or '-'}")
        lines.append(
            "- **工具/技能:** " + format_list(s.get("required_tools"))
        )
        lines.append("- **專長:** " + format_list(s.get("required_skills")))
        lines.append("")
        lines.append("### 工作內容")
        lines.append((s.get("job_description") or "").strip() or "-")
        lines.append("")
        lines.append("### 其他條件")
        lines.append((s.get("other_requirement") or "").strip() or "-")
        lines.append("")
        lines.append("---")
        lines.append("")
    return "\n".join(lines)


def format_list(value: Any) -> str:
    if not value:
        return "-"
    if isinstance(value, list):
        parts: list[str] = []
        for item in value:
            if isinstance(item, dict):
                parts.append(str(item.get("description") or item.get("name") or item))
            else:
                parts.append(str(item))
        return ", ".join(parts)
    return str(value)


def main() -> int:
    ids_str = os.environ.get("JOB_IDS", "")
    if not ids_str and len(sys.argv) > 1:
        ids_str = " ".join(sys.argv[1:])
    if not ids_str:
        ids_file = Path("scripts/104_ids.txt")
        if ids_file.exists():
            ids_str = ids_file.read_text()
    job_ids = [x.strip() for x in ids_str.replace(",", " ").split() if x.strip()]
    if not job_ids:
        print("No job IDs supplied. Set JOB_IDS env var, pass as args, or")
        print("create scripts/104_ids.txt.")
        return 1

    print(f"Fetching {len(job_ids)} jobs...")
    summaries: list[dict[str, Any]] = []
    for jid in job_ids:
        print(f"- {jid}")
        raw = fetch_one(jid)
        if raw is None:
            summaries.append({"id": jid, "error": "fetch_failed"})
            time.sleep(2)
            continue
        (OUT_DIR / f"{jid}.json").write_text(
            json.dumps(raw, ensure_ascii=False, indent=2)
        )
        summary = extract_summary(raw)
        summary["id"] = jid
        summaries.append(summary)
        time.sleep(1.5)

    (OUT_DIR / "summary.json").write_text(
        json.dumps(summaries, ensure_ascii=False, indent=2)
    )
    (OUT_DIR / "jobs.md").write_text(render_md(summaries))

    ok = sum(1 for s in summaries if "error" not in s)
    print(f"\n✅ Done. {ok}/{len(summaries)} records written to {OUT_DIR}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
