"""TRIBE v2 Personal Research Sandbox — Creative Pre-Flight.

Runs Meta FAIR's TRIBE v2 brain encoder over an ad creative (video, audio,
or text) and reports predicted cortical activity on the fsaverage5 surface.

======================================================================
 LICENSE NOTICE — CC-BY-NC-4.0
 TRIBE v2 is released under Creative Commons Attribution-NonCommercial
 4.0. Outputs from this script are for PERSONAL RESEARCH AND
 EXPLORATION ONLY. They CANNOT be used to select, rank, optimize,
 or justify commercial advertising or content decisions for 崑家汽車
 or any other commercial entity.
======================================================================

Setup (one-time):
  bash scripts/tribe-sandbox/setup.sh
  source scripts/tribe-sandbox/.venv/bin/activate

Usage:
  python scripts/tribe-sandbox/run_preflight.py --video path/to/ad.mp4
  python scripts/tribe-sandbox/run_preflight.py --audio path/to/voiceover.wav
  python scripts/tribe-sandbox/run_preflight.py --text path/to/copy.txt
  python scripts/tribe-sandbox/run_preflight.py --video ad.mp4 --output-dir out/run01

Outputs (written to --output-dir, default: ./out/<input-stem>/):
  preds.npy           raw (n_timesteps, n_vertices) tensor
  timeline.png        mean activity across vertices per timestep
  heatmap_lh.png      time-averaged activity, left hemisphere
  heatmap_rh.png      time-averaged activity, right hemisphere
  summary.json        shape, peak timestep, global stats

Hardware:
  TRIBE v2 bundles LLaMA 3.2, V-JEPA2, and Wav2Vec-BERT backbones.
  A CUDA GPU with >=24 GB VRAM is strongly recommended. CPU inference
  will be very slow (minutes to hours per creative).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

LICENSE_BANNER = """\
======================================================================
 TRIBE v2 PERSONAL RESEARCH SANDBOX
 License: CC-BY-NC-4.0 — NON-COMMERCIAL USE ONLY
 Outputs CANNOT be used to drive commercial advertising or content
 decisions for 崑家汽車. This tool is for personal exploration only.
======================================================================
"""


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Run TRIBE v2 brain encoder on a creative (video/audio/text).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--video", type=Path, help="Path to a video file (.mp4 etc.)")
    src.add_argument("--audio", type=Path, help="Path to an audio file (.wav etc.)")
    src.add_argument("--text", type=Path, help="Path to a UTF-8 text file")
    p.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Where to write outputs (default: ./out/<input-stem>/)",
    )
    p.add_argument(
        "--cache-folder",
        type=Path,
        default=Path("./cache"),
        help="HuggingFace model cache directory",
    )
    return p.parse_args()


def resolve_output_dir(args: argparse.Namespace) -> Path:
    if args.output_dir is not None:
        return args.output_dir
    src: Path = args.video or args.audio or args.text
    return Path("out") / src.stem


def run_inference(args: argparse.Namespace) -> tuple[Any, Any]:
    # Deferred import so --help works without the venv active.
    from tribev2 import TribeModel  # type: ignore[import-not-found]

    print("Loading TRIBE v2 weights from HuggingFace (first run downloads)...")
    model = TribeModel.from_pretrained(
        "facebook/tribev2", cache_folder=str(args.cache_folder)
    )

    if args.video is not None:
        events = model.get_events_dataframe(video_path=str(args.video))
    elif args.audio is not None:
        events = model.get_events_dataframe(audio_path=str(args.audio))
    else:
        events = model.get_events_dataframe(text_path=str(args.text))

    print("Running TRIBE v2 prediction...")
    preds, segments = model.predict(events=events)
    return preds, segments


def save_timeline_plot(preds: Any, out_path: Path) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import numpy as np

    mean_over_vertices = np.asarray(preds).mean(axis=1)
    fig, ax = plt.subplots(figsize=(10, 3))
    ax.plot(mean_over_vertices)
    ax.set_xlabel("timestep")
    ax.set_ylabel("mean predicted BOLD (z)")
    ax.set_title("Mean cortical activity over time")
    fig.tight_layout()
    fig.savefig(out_path, dpi=120)
    plt.close(fig)


def save_cortical_heatmaps(preds: Any, out_dir: Path) -> None:
    """Render time-averaged activity on fsaverage5 left/right hemispheres.

    Assumes TRIBE v2 returns vertices in fsaverage5 order: left hemisphere
    first (10242 vertices), right hemisphere second (10242 vertices). If the
    tensor shape does not match this layout, caller handles the exception.
    """
    import numpy as np
    from nilearn import datasets, plotting

    arr = np.asarray(preds)
    mean_over_time = arr.mean(axis=0)
    n_vertices = mean_over_time.shape[0]
    half = n_vertices // 2
    lh_values = mean_over_time[:half]
    rh_values = mean_over_time[half:]

    fsaverage = datasets.fetch_surf_fsaverage("fsaverage5")
    for hemi, values, infl, out_name in [
        ("left", lh_values, fsaverage.infl_left, "heatmap_lh.png"),
        ("right", rh_values, fsaverage.infl_right, "heatmap_rh.png"),
    ]:
        fig = plotting.plot_surf_stat_map(
            infl,
            values,
            hemi=hemi,
            title=f"TRIBE v2 predicted BOLD ({hemi} hemi, time-averaged)",
            colorbar=True,
        )
        fig.savefig(out_dir / out_name, dpi=120)


def save_summary(preds: Any, out_path: Path) -> dict[str, Any]:
    import numpy as np

    arr = np.asarray(preds)
    mean_timeline = arr.mean(axis=1)
    summary: dict[str, Any] = {
        "shape": list(arr.shape),
        "n_timesteps": int(arr.shape[0]),
        "n_vertices": int(arr.shape[1]),
        "peak_timestep": int(np.argmax(mean_timeline)),
        "peak_mean_activity": float(np.max(mean_timeline)),
        "min_mean_activity": float(np.min(mean_timeline)),
        "global_mean": float(arr.mean()),
        "global_std": float(arr.std()),
    }
    out_path.write_text(json.dumps(summary, indent=2))
    return summary


def main() -> int:
    print(LICENSE_BANNER)
    args = parse_args()

    src: Path = args.video or args.audio or args.text
    if not src.exists():
        print(f"ERROR: input file not found: {src}", file=sys.stderr)
        return 2

    out_dir = resolve_output_dir(args)
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"Output dir: {out_dir.resolve()}")

    try:
        preds, _segments = run_inference(args)
    except ImportError as e:
        print(
            f"ERROR: tribev2 not installed. Run setup.sh first. ({e})",
            file=sys.stderr,
        )
        return 3

    import numpy as np

    np.save(out_dir / "preds.npy", np.asarray(preds))
    print(f"  wrote {out_dir / 'preds.npy'}")

    summary = save_summary(preds, out_dir / "summary.json")
    print(f"  wrote {out_dir / 'summary.json'}")
    print(
        f"  shape={summary['shape']}  peak_t={summary['peak_timestep']}  "
        f"global_mean={summary['global_mean']:.4f}"
    )

    try:
        save_timeline_plot(preds, out_dir / "timeline.png")
        print(f"  wrote {out_dir / 'timeline.png'}")
    except Exception as e:  # pragma: no cover - visualization is best-effort
        print(f"  WARN: timeline plot failed: {e}", file=sys.stderr)

    try:
        save_cortical_heatmaps(preds, out_dir)
        print(f"  wrote {out_dir / 'heatmap_lh.png'}")
        print(f"  wrote {out_dir / 'heatmap_rh.png'}")
    except Exception as e:  # pragma: no cover - visualization is best-effort
        print(f"  WARN: cortical heatmap failed: {e}", file=sys.stderr)
        print(
            "  (raw preds.npy is still saved — you can visualize it manually)",
            file=sys.stderr,
        )

    print("\nDone. Remember: CC-BY-NC — personal research only.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
