"""
Slide layout templates for 崑家汽車 carousel generator.

Brand specs:
  - Primary (deep navy): #1c3a5e
  - Background white: #fafafa
  - Foreground dark: #1a1f2e
  - Font: Noto Sans CJK TC (Chinese) / Inter (English fallback)
  - Card radius: 10px (visual warmth for local dealership)
"""

# Brand colors (RGB tuples)
NAVY = (28, 58, 94)        # #1c3a5e — primary background
WHITE = (250, 250, 250)    # #fafafa — text on dark
DARK = (26, 31, 46)        # #1a1f2e — text on light
ACCENT = (58, 108, 168)    # lighter navy for subtle accents

# Canvas sizes
PORTRAIT = (1080, 1350)    # IG/FB optimal portrait
SQUARE = (1080, 1080)      # Universal square

# Layout definitions — all values in pixels, origin top-left
# Coordinates are for PORTRAIT (1080x1350). Square layouts auto-adjust.

LAYOUTS = {
    "cover": {
        "description": "First slide — big headline hook",
        "bg_color": NAVY,
        "elements": {
            "badge": {
                "text": "崑家汽車",
                "position": (540, 120),  # center x, y
                "font_size": 28,
                "color": ACCENT,
                "anchor": "mm",
            },
            "headline": {
                "position": (540, 580),
                "max_width": 880,
                "font_size": 72,
                "color": WHITE,
                "anchor": "mm",
                "line_spacing": 20,
            },
            "subtitle": {
                "position": (540, 750),
                "max_width": 800,
                "font_size": 32,
                "color": (*WHITE[:3],),
                "anchor": "mm",
            },
            "watermark": {
                "text": "崑家汽車 KUN MOTORS",
                "position": (540, 1280),
                "font_size": 20,
                "color": ACCENT,
                "anchor": "mm",
            },
        },
    },
    "content": {
        "description": "Body slides — slide number + headline + body",
        "bg_color": NAVY,
        "elements": {
            "slide_number": {
                "position": (100, 120),
                "font_size": 64,
                "color": ACCENT,
                "anchor": "lm",
            },
            "divider": {
                "start": (100, 180),
                "end": (980, 180),
                "color": ACCENT,
                "width": 2,
            },
            "headline": {
                "position": (100, 280),
                "max_width": 880,
                "font_size": 48,
                "color": WHITE,
                "anchor": "la",
                "line_spacing": 14,
            },
            "body": {
                "position": (100, 450),
                "max_width": 880,
                "font_size": 30,
                "color": (200, 210, 225),
                "anchor": "la",
                "line_spacing": 18,
            },
            "watermark": {
                "text": "崑家汽車 KUN MOTORS",
                "position": (540, 1280),
                "font_size": 20,
                "color": ACCENT,
                "anchor": "mm",
            },
        },
    },
    "cta": {
        "description": "Last slide — call to action",
        "bg_color": NAVY,
        "elements": {
            "headline": {
                "position": (540, 480),
                "max_width": 880,
                "font_size": 56,
                "color": WHITE,
                "anchor": "mm",
                "line_spacing": 18,
            },
            "cta_text": {
                "position": (540, 680),
                "max_width": 800,
                "font_size": 36,
                "color": ACCENT,
                "anchor": "mm",
            },
            "contact": {
                "position": (540, 820),
                "max_width": 800,
                "font_size": 28,
                "color": (200, 210, 225),
                "anchor": "mm",
            },
            "watermark": {
                "text": "崑家汽車 KUN MOTORS",
                "position": (540, 1280),
                "font_size": 20,
                "color": ACCENT,
                "anchor": "mm",
            },
        },
    },
}


def get_layout(slide_type: str, canvas_format: str = "portrait") -> dict:
    """Get layout config, adjusting for square format if needed."""
    layout = LAYOUTS.get(slide_type, LAYOUTS["content"]).copy()

    if canvas_format == "square":
        layout = _adjust_for_square(layout)

    return layout


def _adjust_for_square(layout: dict) -> dict:
    """Scale vertical positions from 1350 height down to 1080."""
    import copy
    adjusted = copy.deepcopy(layout)
    scale = 1080 / 1350

    for key, elem in adjusted.get("elements", {}).items():
        if "position" in elem:
            x, y = elem["position"]
            elem["position"] = (x, int(y * scale))
        if "start" in elem:
            x, y = elem["start"]
            elem["start"] = (x, int(y * scale))
        if "end" in elem:
            x, y = elem["end"]
            elem["end"] = (x, int(y * scale))

    return adjusted
