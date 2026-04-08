# 崑家汽車 — Design System

> **Audience:** AI coding agents (Claude, Copilot, Cursor) editing the kun-auto-chatbot frontend.
> **Goal:** Every new component, page, or refactor produced by an AI converges toward a single, premium, automotive aesthetic instead of drifting.
> **Inspiration:** Adapted from [VoltAgent's BMW DESIGN.md](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/bmw/DESIGN.md), then rebuilt around the project's actual stack (Tailwind v4 + shadcn/ui + Inter + Noto Sans TC).

---

## 0. Source of Truth

The **canonical** design tokens live in `client/src/index.css` as CSS custom properties (oklch + shadcn naming).
This document explains *why* the tokens look the way they do and *how* to use them. **If this doc disagrees with `index.css`, `index.css` wins** — update this doc, never hardcode hex values into components.

---

## 1. Visual Theme & Atmosphere

崑家汽車 is a Taiwanese used-car dealership. The site must feel like a **premium showroom**, not a classified-ad board. Three forces define the aesthetic:

1. **Trust** — customers spend NT$300k–2M here. Every pixel should communicate "this is a real business that respects your money."
2. **Premium showroom rhythm** — alternating dark hero sections (full-bleed vehicle photography) and clean white content sections, like spotlit cars in a darkened showroom.
3. **Approachable warmth** — unlike BMW's cold German precision, kun-auto serves a Taiwanese local market. Corners are softened (10px radius), Chinese typography is honored, and the LINE-first communication channel is treated as a first-class surface.

**Defining gestures**
- Deep navy as the only chromatic accent (`--primary` ≈ `oklch(0.35 0.08 250)`) — automotive trust, never decorative
- Inter for Latin + Noto Sans TC for Chinese — paired explicitly so 中文 and English line up
- 10px (`--radius`) base radius — softer than BMW, sharper than consumer apps; the "premium-but-not-corporate" sweet spot
- Full-bleed vehicle photography drives emotion; UI is restrained
- Tight line-heights (1.20–1.40) — efficient, never breathy

---

## 2. Color Palette (oklch, source: `index.css`)

> All values are oklch tokens defined in `client/src/index.css`. **Use the CSS variables**, not raw values.

### Light Theme

| Role | CSS variable | oklch value | Use |
|---|---|---|---|
| Background | `--background` | `oklch(0.985 0.002 250)` | Page surface |
| Foreground | `--foreground` | `oklch(0.18 0.02 250)` | Primary text |
| Card | `--card` | `oklch(1 0 0)` | Vehicle cards, modals, surfaces |
| Primary | `--primary` | `oklch(0.35 0.08 250)` | CTAs, links, key actions |
| Secondary | `--secondary` | `oklch(0.96 0.005 250)` | Subtle backgrounds, chips |
| Muted | `--muted` | `oklch(0.955 0.005 250)` | Form field backgrounds, dividers |
| Muted FG | `--muted-foreground` | `oklch(0.5 0.02 250)` | Metadata, captions, year/mileage labels |
| Border | `--border` | `oklch(0.91 0.005 250)` | Card borders, input borders |
| Destructive | `--destructive` | `oklch(0.577 0.245 27.325)` | Errors, "刪除", validation failures |

### Dark Theme

| Role | CSS variable | oklch value |
|---|---|---|
| Background | `--background` | `oklch(0.14 0.01 250)` |
| Foreground | `--foreground` | `oklch(0.88 0.005 250)` |
| Card | `--card` | `oklch(0.19 0.012 250)` |
| Primary | `--primary` | `oklch(0.55 0.12 250)` (lighter, more luminous) |

### Color Rules

- **Navy is the ONLY accent.** Never introduce a second hue for decoration. If you need contrast inside a card, use the muted/secondary scale, not a new color.
- **Destructive red is reserved for errors and confirmations.** Never use it for emphasis or "hot" badges (use foreground bold instead).
- **No raw hex codes in components.** Always use `bg-primary`, `text-foreground`, `border-border`, etc. — never `bg-[#1c69d4]`.
- **Charts:** use the `--chart-1` through `--chart-5` ramp. They are tuned to harmonize with the navy primary.

---

## 3. Typography

### Font Stack

Defined in `index.css`:
```css
--font-sans: "Inter", "Noto Sans TC", system-ui, sans-serif;
```

- **Inter** handles all Latin characters, numbers, and UI labels.
- **Noto Sans TC** automatically picks up Chinese glyphs (Traditional Chinese — 繁體中文).
- The fallback to `system-ui` keeps SSR snapshots correct before web fonts load.

### Hierarchy

| Role | Tailwind class | Size | Weight | Line height | Notes |
|---|---|---|---|---|---|
| Display Hero | `text-5xl md:text-6xl font-light tracking-tight` | 48–60px | 300 | 1.10 | Landing page headlines, vehicle detail title |
| Section Heading | `text-3xl font-semibold tracking-tight` | 30px | 600 | 1.20 | Major page sections |
| Card Title | `text-xl font-semibold` | 20px | 600 | 1.30 | Vehicle name on a card |
| Price | `text-2xl font-bold tabular-nums` | 24px | 700 | 1.20 | Always `tabular-nums` so prices align |
| Body | `text-base` | 16px | 400 | 1.50 | Default body |
| Body Small | `text-sm` | 14px | 400 | 1.50 | Vehicle metadata (year, mileage) |
| Meta / Caption | `text-xs text-muted-foreground` | 12px | 400 | 1.40 | Timestamps, "已下架", source labels |
| Button | `text-sm font-medium` | 14px | 500 | 1.20 | Standard shadcn button |
| Nav | `text-sm font-medium` | 14px | 500 | 1.20 | Navigation links |

### Typography Principles

1. **Light display, medium body** — weight 300 for hero headlines (whispered authority), weight 400/500 for body, weight 600/700 for emphasis. **Avoid weight 800/900** — too aggressive for the warm-Taiwanese tone.
2. **`tabular-nums` for ALL prices and mileage.** Numbers must align in vertical lists. This is non-negotiable on vehicle cards.
3. **Tight tracking on display, normal on body.** Use `tracking-tight` only at `text-3xl` and above.
4. **Never uppercase Chinese.** BMW's signature uppercase display only applies to Latin headings — Chinese characters do not have case. For Chinese hero text, lean on weight contrast (300 for the headline, 700 for one accent word) instead.
5. **Line heights stay tight.** 1.10–1.50 across the system. Never use Tailwind's default `leading-loose`.

### Mixed-language headlines

When a headline mixes Chinese and Latin (very common — "Toyota RAV4 2020 年式"), wrap with `font-sans` and trust the cascade. Do **not** manually swap fonts mid-string.

---

## 4. Components

### Buttons (shadcn `Button`)

- **Primary CTA** (`variant="default"`): `bg-primary text-primary-foreground` — used for "聯繫業務", "預約賞車", "申請貸款"
- **Secondary** (`variant="secondary"`): `bg-secondary text-secondary-foreground` — used for "看更多", "返回"
- **Outline** (`variant="outline"`): used for tertiary actions
- **Ghost** (`variant="ghost"`): used inside cards or toolbars
- **Destructive** (`variant="destructive"`): only for "刪除", "取消預約", confirmation dialogs
- Border radius: always `--radius` (10px). Never `rounded-full` for primary CTAs (looks consumer-app, not premium).
- Use `gap-2` between icon and label inside buttons.
- Sizing: `sm` for inline / table actions, `default` for forms, `lg` for landing-page CTAs.

### Vehicle Cards (the most important component)

**Anatomy:**
1. Full-width photo, 4:3 aspect ratio, `rounded-t-[var(--radius)]`
2. Brand + model — `text-xl font-semibold`
3. Year, mileage, transmission — `text-sm text-muted-foreground`, separated by `·`
4. Price — `text-2xl font-bold tabular-nums text-foreground` (NOT primary; price is data, not a CTA)
5. Optional badge row — "認證好車", "新到貨" — small chips, `bg-secondary`
6. CTA — `Button` primary, full width on mobile, auto on desktop

**Rules:**
- Card uses `bg-card border border-border` — never raw white, always the token (so dark mode works).
- Hover state: subtle lift only — `hover:shadow-md transition-shadow`. **No** color shifts, no border color change.
- Photography always loads from a CDN with `loading="lazy"` except above-the-fold. Use a skeleton (`Skeleton` from shadcn) for loading states, never a spinner.

### Forms (loan inquiry, book visit)

- Labels: `text-sm font-medium mb-1.5`
- Inputs: `h-11` (44px touch target — Taiwanese mobile users), `rounded-[var(--radius)]`, `border-border`
- Required marker: small `text-destructive` asterisk after the label
- Helper text: `text-xs text-muted-foreground mt-1`
- Phone input: always allow `09xxxxxxxx` and `09xx-xxx-xxx` formats — never reject hyphens
- Submit button: full width on mobile, `lg` size, primary variant

### Navigation

- Desktop: horizontal nav, `text-sm font-medium`, items separated by generous space (32px)
- Mobile: hamburger → full-screen sheet (shadcn `Sheet`), not a dropdown
- Active state: `text-primary` (no underline, no background)
- Logo position: top-left, fixed height 40px

### LINE Flex Cards (server-rendered)

These live in `server/lineFlexTemplates.ts`. The DESIGN.md applies in spirit:
- Hero image full-width, `aspectRatio: "320:213"` (close to 4:3)
- Vehicle name: `weight: "bold"`, `size: "lg"`
- Price: `weight: "bold"`, `color: "#1F2937"` (matches `--foreground` light mode)
- CTA buttons: `style: "primary"`, `color: "#1F3A8A"` (matches `--primary` light mode)
- See `lineFlexTemplates.ts` for the canonical templates — keep this doc and that file in sync.

---

## 5. Layout & Spacing

### Spacing Scale (Tailwind defaults — do not invent new ones)

`0, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32` (× 4px)

- Use `gap-*` for flex/grid, never margin-on-children
- Section padding: `py-12 md:py-20` for major sections, `py-6 md:py-8` for compact ones
- Card padding: `p-4 md:p-6`
- Container: existing `.container` class in `index.css` already handles max-width 1280px

### Grid

- Vehicle list: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6`
- Form layout: single column on mobile, 2-column on `md:` (label left, field right) only for admin pages
- Hero: full-bleed (`-mx-4` or absolute positioning)

### Border Radius (the big BMW deviation)

The BMW DESIGN.md says **0px radius everywhere**. We deliberately deviate.

| Element | Radius |
|---|---|
| Cards, buttons, inputs | `var(--radius)` = 10px |
| Small elements (badges, chips) | `var(--radius-sm)` = 6px |
| Large elements (modals, drawers) | `var(--radius-lg)` = 10px (same as base in this system) |
| Photos inside cards | `var(--radius)` top corners only when they sit at the top of a card |
| Avatars | `rounded-full` (the only place full-round is allowed) |

**Why softer than BMW:** kun-auto serves a Taiwanese local market where extreme German angularity feels cold and unfamiliar. 10px is the line where "premium" meets "approachable."

---

## 6. Depth & Elevation

| Level | Treatment | Use |
|---|---|---|
| 0 — Photography | Full-bleed image, no shadow | Hero sections, vehicle photos |
| 1 — Flat | Token color (`bg-card`), `border-border` | Default cards |
| 2 — Hover | `shadow-md` | Card hover |
| 3 — Floating | `shadow-lg` | Modals, popovers |
| 4 — Anchored | `shadow-xl` | Floating action buttons, sticky LINE button |

**Shadow philosophy:** depth comes from the **dark hero / white content** rhythm, not from drop shadows piled on every card. Use shadows sparingly. If you find yourself adding `shadow-2xl`, you're probably solving the wrong problem.

---

## 7. Imagery

- **Vehicle photos** are the emotional core of the site. Always full-color, never tinted, never with overlays unless absolutely required for legibility.
- **Hero photos** should be wide cinematic crops (16:9 or 21:9), often dark-toned, with the headline overlaid bottom-left.
- **Car listings** use 4:3 — close to what real estate listings use, gives space for the whole vehicle.
- **Lazy load everything below the fold** (`loading="lazy"`) — Taiwanese mobile networks vary widely, performance is a feature.
- **Use `<img>` with `srcset`**, not background-images, so users can long-press to save (a real customer behavior here).
- **No stock photos.** Every car shown should be a real vehicle from inventory. If the inventory image is missing, show a clean placeholder card with the silhouette icon, never a generic "car" stock photo.

---

## 8. Do's and Don'ts

### Do
- ✅ Use CSS variables (`bg-primary`, `text-foreground`) — never raw hex
- ✅ Keep navy as the only chromatic accent
- ✅ Use `tabular-nums` on every price and mileage value
- ✅ Pair Inter + Noto Sans TC via the `--font-sans` cascade
- ✅ 10px radius on cards/buttons, 6px on chips, full-round only on avatars
- ✅ Tight line-heights (1.10–1.50)
- ✅ Lazy-load below-the-fold images
- ✅ Use shadcn primitives — don't roll custom inputs/buttons

### Don't
- ❌ Hardcode hex colors in components (`bg-[#1c69d4]`) — use tokens
- ❌ Introduce a second accent color (orange "hot deal" badges, green "available" pills, etc.) — use weight + token grays instead
- ❌ Use weight 800/900 for body text — too aggressive for Chinese
- ❌ Use `rounded-full` for buttons (consumer-app feel)
- ❌ Use stock car photos
- ❌ Add drop shadows to compensate for unclear hierarchy — fix the hierarchy
- ❌ Use generic spinners — use shadcn `Skeleton`
- ❌ Mix font families mid-string (let the cascade handle CJK)

---

## 9. Responsive Behavior

### Breakpoints (Tailwind defaults)

| Name | Min width | Primary use |
|---|---|---|
| Default | 0 | Mobile-first, single column |
| `sm` | 640 | Phablet / small tablet |
| `md` | 768 | Tablet — 2-column grids appear |
| `lg` | 1024 | Desktop — 3-column grids, sidebar visible |
| `xl` | 1280 | Wide desktop — max content width |
| `2xl` | 1536 | Ultra-wide — limit content, expand hero |

### Mobile-first defaults

- Most users hit kun-auto from a LINE in-app browser on mobile. **Design mobile first**, then enhance for desktop.
- Touch targets: minimum `h-11` (44px) for any interactive element
- Tap-to-call links (`tel:`) on every phone number
- LINE share button visible on every vehicle detail page
- Sticky footer CTA on mobile vehicle pages: "聯繫業務" + "加 LINE" pair

---

## 10. Agent Prompt Guide

When asking an AI agent to build or refactor a UI element, copy one of these prompts as a starter:

### Vehicle Card
> "Build a vehicle card using the kunjia DESIGN.md. Use `bg-card border border-border rounded-[var(--radius)]`. Photo is 4:3 with `rounded-t-[var(--radius)]`. Brand + model in `text-xl font-semibold`, year/mileage in `text-sm text-muted-foreground`, price in `text-2xl font-bold tabular-nums`. CTA is shadcn Button primary, full-width on mobile."

### Hero Section
> "Build a hero section using the kunjia DESIGN.md. Full-bleed dark vehicle photography background. Headline at `text-5xl md:text-6xl font-light tracking-tight` with mixed Chinese + brand name. CTA primary Button size `lg`. No drop shadows on the headline — let the photo carry it."

### Form (loan inquiry, book visit)
> "Build the form using the kunjia DESIGN.md and shadcn primitives. Inputs `h-11` for touch targets, labels `text-sm font-medium mb-1.5`, helper text `text-xs text-muted-foreground mt-1`. Required marker is a `text-destructive` asterisk. Submit is full-width primary Button size `lg`."

### Quick token reference
- Primary: `bg-primary` / `text-primary`
- Surface: `bg-background`, `bg-card`, `bg-muted`
- Text: `text-foreground` / `text-muted-foreground`
- Borders: `border-border`
- Radius: `rounded-[var(--radius)]` (10px) / `rounded-sm` (6px)
- Font weights: 300 (display only), 400 (body), 500 (UI), 600/700 (emphasis) — avoid 800/900
- Always: `tabular-nums` on prices and mileage

---

## 11. Maintenance

- **When you change `client/src/index.css`**, update Section 2 of this doc in the same commit.
- **When you add a new component pattern that other AI agents should reuse**, add it to Section 4.
- **When you find yourself reaching for a hex code in a component**, that's a signal to add a token to `index.css` and reference it here — not to hardcode.
- This doc is meant to be **read by AI agents at the start of UI work**. Reference it in `CLAUDE.md` so it loads automatically.
