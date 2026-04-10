#!/usr/bin/env python3
"""
崑家汽車 Carousel Generator — PIL-based branded slide images.

Generates numbered carousel slides for Instagram, Facebook, and other platforms.
Deep navy background (#1c3a5e) with white text, Chinese support via Noto Sans CJK TC.

Usage:
  python generate.py --demo                          # Generate demo slides
  python generate.py --title "標題" --slides 6       # From CLI args
  python generate.py --json slides.json              # From JSON file
  python generate.py --title "標題" --format square   # 1080x1080 instead of 1080x1350
"""

import argparse
import json
import os
import sys
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from templates import LAYOUTS, NAVY, WHITE, ACCENT, PORTRAIT, SQUARE, get_layout

SCRIPT_DIR = Path(__file__).parent
FONTS_DIR = SCRIPT_DIR / "fonts"
OUTPUT_DIR = SCRIPT_DIR / "output"

# Font paths — try bundled first, then system fallback
FONT_PATHS = {
    "bold": [
        FONTS_DIR / "NotoSansCJKtc-Bold.otf",
        Path("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"),
    ],
    "regular": [
        FONTS_DIR / "NotoSansCJKtc-Regular.otf",
        Path("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"),
    ],
}


def load_font(style: str, size: int) -> ImageFont.FreeTypeFont:
    """Load font with fallback chain."""
    for path in FONT_PATHS.get(style, FONT_PATHS["regular"]):
        if path.exists():
            return ImageFont.truetype(str(path), size)
    # Last resort: Pillow default
    return ImageFont.load_default()


def wrap_text(text: str, font: ImageFont.FreeTypeFont, max_width: int, draw: ImageDraw.Draw) -> list[str]:
    """Word-wrap text to fit within max_width pixels. Handles Chinese characters."""
    lines = []
    for paragraph in text.split("\n"):
        if not paragraph.strip():
            lines.append("")
            continue
        current = ""
        for char in paragraph:
            test = current + char
            bbox = draw.textbbox((0, 0), test, font=font)
            if bbox[2] - bbox[0] > max_width and current:
                lines.append(current)
                current = char
            else:
                current = test
        if current:
            lines.append(current)
    return lines


def draw_wrapped_text(
    draw: ImageDraw.Draw,
    text: str,
    position: tuple[int, int],
    font: ImageFont.FreeTypeFont,
    color: tuple,
    max_width: int,
    anchor: str = "la",
    line_spacing: int = 10,
) -> int:
    """Draw word-wrapped text and return total height used."""
    lines = wrap_text(text, font, max_width, draw)
    x, y = position
    total_height = 0

    for line in lines:
        bbox = draw.textbbox((0, 0), line or " ", font=font)
        line_height = bbox[3] - bbox[1]

        if anchor.startswith("m"):
            draw.text((x, y), line, font=font, fill=color, anchor="mm")
        else:
            draw.text((x, y), line, font=font, fill=color, anchor="la")

        y += line_height + line_spacing
        total_height += line_height + line_spacing

    return total_height


def render_slide(
    slide_type: str,
    canvas_size: tuple[int, int],
    canvas_format: str,
    headline: str = "",
    body: str = "",
    slide_number: int = 0,
    total_slides: int = 0,
    subtitle: str = "",
    cta_text: str = "",
    contact: str = "",
) -> Image.Image:
    """Render a single carousel slide."""
    layout = get_layout(slide_type, canvas_format)
    img = Image.new("RGB", canvas_size, layout["bg_color"])
    draw = ImageDraw.Draw(img)
    elements = layout["elements"]

    # Badge (cover only)
    if "badge" in elements:
        elem = elements["badge"]
        font = load_font("regular", elem["font_size"])
        draw.text(elem["position"], elem["text"], font=font, fill=elem["color"], anchor=elem["anchor"])

    # Slide number (content slides)
    if "slide_number" in elements and slide_number > 0:
        elem = elements["slide_number"]
        font = load_font("bold", elem["font_size"])
        num_text = f"{slide_number:02d}"
        draw.text(elem["position"], num_text, font=font, fill=elem["color"], anchor=elem["anchor"])

    # Divider line
    if "divider" in elements:
        elem = elements["divider"]
        draw.line([elem["start"], elem["end"]], fill=elem["color"], width=elem["width"])

    # Headline
    if "headline" in elements and headline:
        elem = elements["headline"]
        font = load_font("bold", elem["font_size"])
        draw_wrapped_text(
            draw, headline, elem["position"], font, elem["color"],
            elem["max_width"], elem.get("anchor", "la"), elem.get("line_spacing", 10),
        )

    # Subtitle (cover)
    if "subtitle" in elements and subtitle:
        elem = elements["subtitle"]
        font = load_font("regular", elem["font_size"])
        draw.text(elem["position"], subtitle, font=font, fill=elem["color"], anchor=elem["anchor"])

    # Body text (content slides)
    if "body" in elements and body:
        elem = elements["body"]
        font = load_font("regular", elem["font_size"])
        draw_wrapped_text(
            draw, body, elem["position"], font, elem["color"],
            elem["max_width"], elem.get("anchor", "la"), elem.get("line_spacing", 18),
        )

    # CTA text
    if "cta_text" in elements and cta_text:
        elem = elements["cta_text"]
        font = load_font("bold", elem["font_size"])
        draw.text(elem["position"], cta_text, font=font, fill=elem["color"], anchor=elem["anchor"])

    # Contact info
    if "contact" in elements and contact:
        elem = elements["contact"]
        font = load_font("regular", elem["font_size"])
        draw.text(elem["position"], contact, font=font, fill=elem["color"], anchor=elem["anchor"])

    # Watermark (always)
    if "watermark" in elements:
        elem = elements["watermark"]
        font = load_font("regular", elem["font_size"])
        draw.text(elem["position"], elem["text"], font=font, fill=elem["color"], anchor=elem["anchor"])

    return img


def generate_carousel(
    title: str,
    slides: list[dict],
    output_dir: Path,
    canvas_format: str = "portrait",
    cta_headline: str = "想了解更多？",
    cta_text: str = "私訊我們或來電預約賞車",
    contact: str = "高雄市 ｜ 崑家汽車 KUN MOTORS",
) -> list[Path]:
    """Generate a full carousel set and save to output_dir."""
    output_dir.mkdir(parents=True, exist_ok=True)
    canvas_size = PORTRAIT if canvas_format == "portrait" else SQUARE
    total = len(slides) + 2  # cover + content slides + CTA
    saved = []

    # Slide 1: Cover
    cover = render_slide(
        "cover", canvas_size, canvas_format,
        headline=title,
        subtitle=f"{len(slides)} 個重點帶你了解",
    )
    path = output_dir / "slide_01_cover.png"
    cover.save(path, "PNG", quality=95)
    saved.append(path)

    # Slides 2..N: Content
    for i, slide in enumerate(slides, start=1):
        content = render_slide(
            "content", canvas_size, canvas_format,
            headline=slide.get("headline", ""),
            body=slide.get("body", ""),
            slide_number=i,
            total_slides=len(slides),
        )
        path = output_dir / f"slide_{i+1:02d}_content.png"
        content.save(path, "PNG", quality=95)
        saved.append(path)

    # Last slide: CTA
    cta = render_slide(
        "cta", canvas_size, canvas_format,
        headline=cta_headline,
        cta_text=cta_text,
        contact=contact,
    )
    path = output_dir / f"slide_{total:02d}_cta.png"
    cta.save(path, "PNG", quality=95)
    saved.append(path)

    return saved


def demo_carousel(output_dir: Path, canvas_format: str = "portrait") -> list[Path]:
    """Generate a demo carousel with sample content."""
    title = "5個買中古車必知的事"
    slides = [
        {
            "headline": "檢查里程數真偽",
            "body": "里程數造假是中古車市場最常見的問題。建議查詢原廠保養紀錄，比對行車電腦數據，確認里程數的真實性。",
        },
        {
            "headline": "索取車況檢測報告",
            "body": "要求賣方提供第三方車況檢測報告。崑家汽車每台車都附 SUM 或 HOT 認證報告，車況透明有保障。",
        },
        {
            "headline": "確認車輛產權清楚",
            "body": "檢查行照、車籍資料是否一致，確認沒有貸款未清、查封或其他產權問題。過戶前務必確認乾淨。",
        },
        {
            "headline": "試駕感受車況",
            "body": "親自試駕才能感受引擎、變速箱、底盤的真實狀態。注意異音、抖動、方向盤偏擺等細節。",
        },
        {
            "headline": "比較行情價格",
            "body": "上 8891、abc賞車網比較同年份、同車型的行情價。崑家汽車定價透明，絕不虛報高價再殺價。",
        },
    ]
    return generate_carousel(title, slides, output_dir, canvas_format)


def main():
    parser = argparse.ArgumentParser(description="崑家汽車 Carousel Generator")
    parser.add_argument("--demo", action="store_true", help="Generate demo carousel")
    parser.add_argument("--title", type=str, help="Carousel title (cover slide)")
    parser.add_argument("--json", type=str, help="Path to JSON file with slide data")
    parser.add_argument("--format", choices=["portrait", "square"], default="portrait",
                        help="Canvas format: portrait (1080x1350) or square (1080x1080)")
    parser.add_argument("--output", type=str, default=None, help="Output directory")
    parser.add_argument("--cta-headline", type=str, default="想了解更多？", help="CTA slide headline")
    parser.add_argument("--cta-text", type=str, default="私訊我們或來電預約賞車", help="CTA action text")
    parser.add_argument("--contact", type=str, default="高雄市 ｜ 崑家汽車 KUN MOTORS", help="Contact line")

    args = parser.parse_args()

    output_dir = Path(args.output) if args.output else OUTPUT_DIR

    if args.demo:
        print(f"Generating demo carousel ({args.format})...")
        paths = demo_carousel(output_dir, args.format)
        print(f"Generated {len(paths)} slides:")
        for p in paths:
            img = Image.open(p)
            print(f"  {p.name} — {img.size[0]}x{img.size[1]}px")
        return

    if args.json:
        with open(args.json, "r", encoding="utf-8") as f:
            data = json.load(f)
        title = data.get("title", args.title or "崑家汽車")
        slides = data.get("slides", [])
    elif args.title:
        # Read slides from stdin as JSON
        print("Enter slides as JSON array (or press Ctrl+D for empty):")
        try:
            raw = sys.stdin.read()
            slides = json.loads(raw) if raw.strip() else []
        except (json.JSONDecodeError, EOFError):
            slides = []
        title = args.title
    else:
        parser.print_help()
        sys.exit(1)

    if not slides:
        print("No slides provided. Use --demo for sample content, or provide --json file.")
        sys.exit(1)

    print(f"Generating carousel: {title} ({len(slides)} slides, {args.format})...")
    paths = generate_carousel(
        title, slides, output_dir, args.format,
        cta_headline=args.cta_headline,
        cta_text=args.cta_text,
        contact=args.contact,
    )
    print(f"Generated {len(paths)} slides:")
    for p in paths:
        img = Image.open(p)
        print(f"  {p.name} — {img.size[0]}x{img.size[1]}px")


if __name__ == "__main__":
    main()
