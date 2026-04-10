"""TRIBE v2 Personal Research Sandbox — A/B Compare.

Runs TRIBE v2 on two creatives of the same modality (video, audio, or text)
and produces a head-to-head comparison of predicted cortical activity.

======================================================================
 LICENSE NOTICE — CC-BY-NC-4.0
 TRIBE v2 is released under Creative Commons Attribution-NonCommercial
 4.0. Outputs from this script are for PERSONAL RESEARCH ONLY and
 CANNOT be used to select, rank, or optimize commercial advertising
 or content for 崑家汽車 or any other commercial entity.
======================================================================

Usage:
  python scripts/tribe-sandbox/compare.py --video-a ad1.mp4 --video-b ad2.mp4
  python scripts/tribe-sandbox/compare.py --audio-a vo1.wav --audio-b vo2.wav
  python scripts/tribe-sandbox/compare.py --text-a copy1.txt --text-b copy2.txt
  python scripts/tribe-sandbox/compare.py --image-a a.jpg --image-b b.jpg

Both inputs MUST be the same modality. Mixing (e.g. --video-a + --text-b)
is rejected.

Image support is an UNOFFICIAL workaround: TRIBE v2 has no native image_path
API. This script converts each still into a 4-second held MP4 via ffmpeg and
feeds it through the video backbone (V-JEPA2). Meta does not endorse this;
treat image-mode outputs as exploratory only. Requires ffmpeg on PATH.

Outputs (written to --output-dir, default: ./out/compare_<modality>_<a>_vs_<b>/):
  preds_a.npy             raw (n_timesteps, n_vertices) tensor for input A
  preds_b.npy             raw (n_timesteps, n_vertices) tensor for input B
  timeline_overlay.png    mean cortical trace for A and B on one axis
  diff_heatmap_lh.png     (mean_b - mean_a) on fsaverage5 left hemisphere
  diff_heatmap_rh.png     (mean_b - mean_a) on fsaverage5 right hemisphere
  diff_summary.json       per-input stats + cosine/L2 comparison

Interpretation hints:
  - Red regions on the diff heatmap = B activated that area more than A.
  - Blue regions on the diff heatmap = A activated that area more than B.
  - cosine_similarity near 1.0 = the two creatives look alike to the brain.
  - cosine_similarity near 0.0 = the two creatives hit different cortex.
  - If A and B have different lengths, peak_shift_timesteps is null and the
    timeline overlay shows each trace over its own x range.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

LICENSE_BANNER = """\
======================================================================
 TRIBE v2 PERSONAL RESEARCH SANDBOX — A/B COMPARE
 License: CC-BY-NC-4.0 — NON-COMMERCIAL USE ONLY
 Outputs CANNOT be used to drive commercial advertising or content
 decisions for 崑家汽車. Personal exploration only.
======================================================================
"""


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Compare two creatives with TRIBE v2 (same modality).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    gA = p.add_mutually_exclusive_group(required=True)
    gA.add_argument("--video-a", type=Path, help="First video")
    gA.add_argument("--audio-a", type=Path, help="First audio")
    gA.add_argument("--text-a", type=Path, help="First text file")
    gA.add_argument(
        "--image-a",
        type=Path,
        help="First still image (converted to a 4s held MP4 via ffmpeg; unofficial)",
    )
    gB = p.add_mutually_exclusive_group(required=True)
    gB.add_argument("--video-b", type=Path, help="Second video")
    gB.add_argument("--audio-b", type=Path, help="Second audio")
    gB.add_argument("--text-b", type=Path, help="Second text file")
    gB.add_argument(
        "--image-b",
        type=Path,
        help="Second still image (converted to a 4s held MP4 via ffmpeg; unofficial)",
    )
    p.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Where to write outputs (default: ./out/compare_<modality>_<a>_vs_<b>/)",
    )
    p.add_argument(
        "--cache-folder",
        type=Path,
        default=Path("./cache"),
        help="HuggingFace model cache directory",
    )
    return p.parse_args()


def resolve_modality(args: argparse.Namespace) -> tuple[str, Path, Path]:
    """Figure out which modality was chosen and return (modality, path_a, path_b).

    Exits with code 2 if A and B disagree on modality.
    """
    if args.video_a is not None and args.video_b is not None:
        return "video", args.video_a, args.video_b
    if args.audio_a is not None and args.audio_b is not None:
        return "audio", args.audio_a, args.audio_b
    if args.text_a is not None and args.text_b is not None:
        return "text", args.text_a, args.text_b
    if args.image_a is not None and args.image_b is not None:
        return "image", args.image_a, args.image_b
    print(
        "ERROR: inputs A and B must be the same modality "
        "(both --video-*, both --audio-*, both --text-*, or both --image-*).",
        file=sys.stderr,
    )
    raise SystemExit(2)


def resolve_output_dir(
    explicit: Path | None, modality: str, path_a: Path, path_b: Path
) -> Path:
    if explicit is not None:
        return explicit
    return Path("out") / f"compare_{modality}_{path_a.stem}_vs_{path_b.stem}"


def run_tribe(modality: str, path: Path, cache_folder: Path) -> Any:
    """Run TRIBE v2 on a single creative and return raw predictions.

    Accepts modality in {"video", "audio", "text"}. For image inputs the
    caller must pre-convert via image_to_held_video() and pass modality="video".
    """
    from tribev2 import TribeModel  # type: ignore[import-not-found]

    model = TribeModel.from_pretrained(
        "facebook/tribev2", cache_folder=str(cache_folder)
    )
    kwargs = {f"{modality}_path": str(path)}
    events = model.get_events_dataframe(**kwargs)
    preds, _segments = model.predict(events=events)
    return preds


def image_to_held_video(
    image_path: Path, out_path: Path, duration: float = 4.0
) -> None:
    """Convert a still image into a held-still MP4 for feeding to TRIBE v2.

    Unofficial workaround: TRIBE v2 has no image_path API, only video_path.
    Wrapping a still into a held MP4 lets us feed images through the V-JEPA2
    video backbone. Meta does not endorse this; interpret outputs accordingly.

    Raises RuntimeError if ffmpeg is not on PATH.
    """
    import shutil
    import subprocess

    if shutil.which("ffmpeg") is None:
        raise RuntimeError(
            "ffmpeg not found on PATH. Install ffmpeg to use image inputs "
            "(apt install ffmpeg / brew install ffmpeg)."
        )
    cmd = [
        "ffmpeg",
        "-y",
        "-loop", "1",
        "-i", str(image_path),
        "-c:v", "libx264",
        "-t", str(duration),
        "-pix_fmt", "yuv420p",
        "-r", "24",
        "-loglevel", "error",
        str(out_path),
    ]
    subprocess.run(cmd, check=True)


def save_timeline_overlay(
    preds_a: Any,
    preds_b: Any,
    label_a: str,
    label_b: str,
    out_path: Path,
) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import numpy as np

    a = np.asarray(preds_a).mean(axis=1)
    b = np.asarray(preds_b).mean(axis=1)
    fig, ax = plt.subplots(figsize=(10, 3.5))
    ax.plot(a, label=f"A: {label_a}")
    ax.plot(b, label=f"B: {label_b}")
    ax.set_xlabel("timestep")
    ax.set_ylabel("mean predicted BOLD (z)")
    ax.set_title("A vs B — mean cortical activity over time")
    ax.legend(loc="best")
    fig.tight_layout()
    fig.savefig(out_path, dpi=120)
    plt.close(fig)


def save_diff_heatmaps(preds_a: Any, preds_b: Any, out_dir: Path) -> None:
    """Render (mean_b - mean_a) on fsaverage5 LH and RH.

    Red = B activates more than A. Blue = A activates more than B.
    """
    import numpy as np
    from nilearn import datasets, plotting

    a = np.asarray(preds_a).mean(axis=0)
    b = np.asarray(preds_b).mean(axis=0)
    diff = b - a
    n_vertices = diff.shape[0]
    half = n_vertices // 2
    lh = diff[:half]
    rh = diff[half:]

    fsaverage = datasets.fetch_surf_fsaverage("fsaverage5")
    for hemi, values, infl, name in [
        ("left", lh, fsaverage.infl_left, "diff_heatmap_lh.png"),
        ("right", rh, fsaverage.infl_right, "diff_heatmap_rh.png"),
    ]:
        fig = plotting.plot_surf_stat_map(
            infl,
            values,
            hemi=hemi,
            title=f"B minus A ({hemi} hemi) — red=B>A, blue=A>B",
            colorbar=True,
            cmap="cold_hot",
        )
        fig.savefig(out_dir / name, dpi=120)


def compute_summary(
    modality: str,
    path_a: Path,
    path_b: Path,
    preds_a: Any,
    preds_b: Any,
) -> dict[str, Any]:
    import numpy as np

    a = np.asarray(preds_a)
    b = np.asarray(preds_b)
    a_time = a.mean(axis=1)
    b_time = b.mean(axis=1)
    a_mean_vertices = a.mean(axis=0)
    b_mean_vertices = b.mean(axis=0)

    num = float((a_mean_vertices * b_mean_vertices).sum())
    denom = float(
        np.linalg.norm(a_mean_vertices) * np.linalg.norm(b_mean_vertices)
    )
    cosine = num / denom if denom > 0 else 0.0
    l2 = float(np.linalg.norm(a_mean_vertices - b_mean_vertices))

    lengths_match = a.shape[0] == b.shape[0]
    peak_shift: int | None = (
        int(np.argmax(b_time) - np.argmax(a_time)) if lengths_match else None
    )

    def per_input(arr: Any) -> dict[str, Any]:
        arr_np = np.asarray(arr)
        t = arr_np.mean(axis=1)
        return {
            "shape": list(arr_np.shape),
            "peak_timestep": int(np.argmax(t)),
            "peak_mean_activity": float(np.max(t)),
            "global_mean": float(arr_np.mean()),
            "global_std": float(arr_np.std()),
        }

    return {
        "modality": modality,
        "input_a": str(path_a),
        "input_b": str(path_b),
        "a": per_input(preds_a),
        "b": per_input(preds_b),
        "comparison": {
            "lengths_match": lengths_match,
            "cosine_similarity_time_averaged": cosine,
            "l2_distance_time_averaged": l2,
            "mean_shift_b_minus_a": float(b.mean() - a.mean()),
            "peak_shift_timesteps": peak_shift,
        },
    }


def main() -> int:
    print(LICENSE_BANNER)
    args = parse_args()

    modality, path_a, path_b = resolve_modality(args)

    for label, p in [("A", path_a), ("B", path_b)]:
        if not p.exists():
            print(f"ERROR: input {label} not found: {p}", file=sys.stderr)
            return 2

    out_dir = resolve_output_dir(args.output_dir, modality, path_a, path_b)
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"Modality: {modality}")
    print(f"Input A:  {path_a}")
    print(f"Input B:  {path_b}")
    print(f"Output:   {out_dir.resolve()}")

    # Keep the originals so the summary JSON records what the user actually
    # passed in (not the temporary held-still MP4 for image modality).
    reported_modality = modality
    original_path_a, original_path_b = path_a, path_b

    if modality == "image":
        print("\nIMAGE WORKAROUND: TRIBE v2 has no native image input.")
        print("  Converting images to 4s held-still MP4s via ffmpeg and")
        print("  feeding them through the video backbone (V-JEPA2).")
        print("  This is unofficial; treat outputs as exploratory only.")
        held_a = out_dir / f"{path_a.stem}_held.mp4"
        held_b = out_dir / f"{path_b.stem}_held.mp4"
        try:
            image_to_held_video(path_a, held_a)
            image_to_held_video(path_b, held_b)
        except RuntimeError as e:
            print(f"ERROR: {e}", file=sys.stderr)
            return 4
        except Exception as e:
            print(f"ERROR: ffmpeg conversion failed: {e}", file=sys.stderr)
            return 4
        path_a, path_b = held_a, held_b
        modality = "video"  # feed to TRIBE v2 as video from here on

    try:
        print("\nRunning TRIBE v2 on input A ...")
        preds_a = run_tribe(modality, path_a, args.cache_folder)
        print("Running TRIBE v2 on input B ...")
        preds_b = run_tribe(modality, path_b, args.cache_folder)
    except ImportError as e:
        print(
            f"ERROR: tribev2 not installed. Run setup.sh first. ({e})",
            file=sys.stderr,
        )
        return 3

    import numpy as np

    np.save(out_dir / "preds_a.npy", np.asarray(preds_a))
    np.save(out_dir / "preds_b.npy", np.asarray(preds_b))
    print(f"  wrote {out_dir / 'preds_a.npy'}")
    print(f"  wrote {out_dir / 'preds_b.npy'}")

    summary = compute_summary(
        reported_modality, original_path_a, original_path_b, preds_a, preds_b
    )
    if reported_modality == "image":
        summary["note"] = (
            "Image inputs were converted to 4s held-still MP4s via ffmpeg and "
            "fed through the TRIBE v2 video backbone. This is an unofficial "
            "workaround; Meta's public API does not support image_path."
        )
    (out_dir / "diff_summary.json").write_text(json.dumps(summary, indent=2))
    print(f"  wrote {out_dir / 'diff_summary.json'}")
    print(
        f"  lengths_match={summary['comparison']['lengths_match']}  "
        f"cosine={summary['comparison']['cosine_similarity_time_averaged']:.4f}  "
        f"L2={summary['comparison']['l2_distance_time_averaged']:.4f}"
    )

    if not summary["comparison"]["lengths_match"]:
        print(
            "  NOTE: A and B have different timestep counts. Timeline overlay "
            "plots each trace over its own x range; peak_shift_timesteps is null.",
            file=sys.stderr,
        )

    try:
        save_timeline_overlay(
            preds_a,
            preds_b,
            original_path_a.stem,
            original_path_b.stem,
            out_dir / "timeline_overlay.png",
        )
        print(f"  wrote {out_dir / 'timeline_overlay.png'}")
    except Exception as e:  # pragma: no cover - visualization is best-effort
        print(f"  WARN: timeline overlay failed: {e}", file=sys.stderr)

    try:
        save_diff_heatmaps(preds_a, preds_b, out_dir)
        print(f"  wrote {out_dir / 'diff_heatmap_lh.png'}")
        print(f"  wrote {out_dir / 'diff_heatmap_rh.png'}")
    except Exception as e:  # pragma: no cover - visualization is best-effort
        print(f"  WARN: diff heatmap failed: {e}", file=sys.stderr)
        print(
            "  (raw preds_a.npy / preds_b.npy are still saved)",
            file=sys.stderr,
        )

    print("\nDone. Remember: CC-BY-NC — personal research only.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
