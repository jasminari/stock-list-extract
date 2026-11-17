---
name: StockExtract
description: One system for the public landing and the authenticated product. The landing sets the brand (white, airy, indigo, bold Korean copy); the product keeps that brand at a denser, data-first scale.
colors:
  primary: "#4f46df"
  primary-hover: "#3c34ba"
  on-primary: "#ffffff"
  link-hover: "#332baf"
  ink: "#20242b"
  muted: "#666b75"
  paper: "#ffffff"
  stage: "#f4f4f6"
  border: "#e5e7eb"
  focus: "#8e87ef"
  keyword-ink: "#594cc0"
  keyword-surface: "#f1efff"
  destructive: "#d12d3a"
  rise: "#b43e3c"
  rise-surface: "#fbeeee"
  fall: "#1065cc"
  fall-surface: "#e8f3ff"
  success: "#007738"
  success-surface: "#e8f5ee"
  warning: "#92400e"
  warning-surface: "#fef3c7"
  reason: "#594cc0"
  reason-surface: "#f1efff"
  news: "#1065cc"
  news-surface: "#e8f3ff"
  memo: "#92400e"
  memo-surface: "#fef3c7"
  positive-rate: "#b43e3c"
typography:
  display:
    fontFamily: '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif'
    fontSize: "43px"
    fontWeight: 780
    lineHeight: 1.44
    letterSpacing: "-0.04em"
  headline:
    fontSize: "29px"
    fontWeight: 750
    lineHeight: 1.45
    letterSpacing: "-0.035em"
  body:
    fontSize: "17px"
    lineHeight: 1.85
  label:
    fontSize: "14px"
    fontWeight: 650
  product-title:
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.375
  product-body:
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  product-label:
    fontSize: "14px"
    fontWeight: 500
  product-caption:
    fontSize: "12px"
    fontWeight: 400
  product-micro:
    fontSize: "11px"
    fontWeight: 500
rounded:
  keyword: "5px"
  small: "8px"
  control: "11px"
  product-control: "12px"
  screen: "13px"
  stock-card: "15px"
  reason-sheet: "16px"
  sheet: "16px"
  stage: "24px"
spacing:
  small: "14px"
  medium: "20px"
  large: "24px"
  desktop-column: "72px"
  section: "140px"
  product-gutter: "16px"
  product-gutter-wide: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "15px 25px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  text-link:
    textColor: "{colors.primary}"
    typography: "{typography.label}"
  keyword:
    backgroundColor: "{colors.keyword-surface}"
    textColor: "{colors.keyword-ink}"
    rounded: "{rounded.keyword}"
    padding: "4px 7px"
  stock-card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.stock-card}"
    padding: "14px 16px"
    height: "73px"
  preview-stage:
    backgroundColor: "{colors.stage}"
    rounded: "{rounded.stage}"
  product-button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.product-control}"
    height: "40px"
    padding: "0 16px"
    typography: "{typography.product-label}"
  product-button-hover:
    backgroundColor: "{colors.primary-hover}"
  product-dialog:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
---

# Design System: StockExtract

## Overview

This document is the single design reference for StockExtract. It has two layers.

- **Brand layer** — shared by every route: StockExtract indigo, white surfaces, dark ink, the Pretendard typeface, soft corners, and plain Korean phrasing. It was established by the public landing and is now the basis for the whole product.
- **Scale layer** — differs by surface. The landing (`/`) uses large marketing type and generous section spacing. The product (`/login`, `/register`, `/dashboard/**`) uses a compact, data-first scale for tables, charts, and sheets.

Take colour, typeface, corner softness, and tone from the brand layer everywhere. Never carry the landing's type sizes or section spacing into the product.

Where the tokens live in code:

- `app/globals.css` — CSS variables (HSL). The source of truth at runtime.
- `tailwind.config.ts` — exposes them as Tailwind classes (`bg-primary`, `text-muted-foreground`, `text-rise`, …).
- `components/ui/` — shadcn-style components built on those classes.
- `components/landing/NotifoldLanding.module.css` — the landing keeps its own CSS module with the same brand values.

When a value changes, change it in `app/globals.css` and in this file's frontmatter together.

Dark mode is not supported. The product hardcodes light surfaces, so no dark token set is defined.

## Colors

### Brand and neutral

| Role | Token | Tailwind class | Value |
|---|---|---|---|
| Primary action, links, selection | `primary` | `bg-primary`, `text-primary` | `#4f46df` |
| Primary hover / strong brand text | `primary-hover` | `bg-primary-hover`, `text-primary-hover` | `#3c34ba` |
| Soft brand surface (selected, keyword, hover) | `keyword-surface` | `bg-accent` | `#f1efff` |
| Text on soft brand surface | `keyword-ink` | `text-accent-foreground` | `#594cc0` |
| Headings and body text | `ink` | `text-foreground` | `#20242b` |
| Supporting text | `muted` | `text-muted-foreground` | `#666b75` |
| Page and card surface | `paper` | `bg-background`, `bg-card` | `#ffffff` |
| Quiet fill (inputs, stages, hover) | `stage` | `bg-muted` | `#f4f4f6` |
| Lines | `border` | `border-border`, `border-input` | `#e5e7eb` |
| Focus ring | `focus` | `ring-ring` | `#8e87ef` |
| Errors, destructive actions | `destructive` | `text-destructive`, `bg-destructive/10` | `#d12d3a` |
| Success, completed | `success` | `text-success`, `bg-success-surface` | `#007738` on `#e8f5ee` |
| Caution, notices | `warning` | `text-warning`, `bg-warning-surface` | `#92400e` on `#fef3c7` |

Text hierarchy uses four steps: `text-foreground`, `text-foreground/80`, `text-muted-foreground`, and `text-muted-foreground/80` for tertiary hints. Anything lighter (`/50`) is for decorative marks and disabled states only.

### Market colours

Korean market convention: **rise is red, fall is blue**. Never swap them, and never use green for a rising price.

| Role | Tailwind class | Value |
|---|---|---|
| Rising price / rate | `text-rise`, `bg-rise-surface` | `#b43e3c` on `#fbeeee` |
| Falling price / rate | `text-fall`, `bg-fall-surface` | `#1065cc` on `#e8f3ff` |
| Unchanged | `text-muted-foreground` | `#666b75` |

Always pair the colour with a sign or arrow (`+`, `−`, ▲, ▼). Numbers use `tabular-nums`. Chart candles use the same two colours (`lib/dailyChart.ts`).

### Record types

The product distinguishes these kinds of record. They must stay visually and verbally separate, and colour alone is never the only cue: each carries a text label. The colours follow the live market-study table.

| Record | Meaning | Tailwind class | Value |
|---|---|---|---|
| Confirmed rise reason (상승 배경) | An article explicitly ties the company-specific event to that day's rise | `text-reason`, `bg-reason-surface` | `#594cc0` on `#f1efff` |
| Related news (관련 재료) | A concrete company event near the date; link to the rise is not confirmed | `text-news`, `bg-news-surface` | `#1065cc` on `#e8f3ff` |
| Business profile (사업 소개) | Company information from DART, not an event | `text-muted-foreground`, `bg-muted` | `#666b75` on `#f4f4f6` |
| My note (내 메모) | Written by the user | `text-memo`, `bg-memo-surface` | `#92400e` on `#fef3c7` |

Show DART business profiles as company information, never as a record on a date. Theme co-movement is excluded. Do not present a news item's timing as the cause of a price move.

### Raw palette exceptions

Product code uses the tokens above, not raw Tailwind palette classes (`indigo-600`, `gray-500`, …). The only places that keep raw colours are data encodings and decoration:

- Heat highlights in the market-study table (orange for trading value, purple for turnover) and their copy in the login preview.
- The ownership table's spreadsheet-style amber header and pink sell rows.
- The watchlist star (amber).
- The contribution graph's five-step indigo scale and the chart's article markers (amber, emerald, indigo).
- Third-party brand colours such as the Kakao button.
- The unused legacy landing components in `components/landing/` other than `NotifoldLanding`.

## Typography

One typeface everywhere: **Pretendard** (variable, weights 45–920), loaded from the `pretendard` package as a dynamic subset in `app/layout.tsx`. The stack is `"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif`. Do not add another typeface. Korean text uses `word-break: keep-all` in headings.

### Product scale

| Role | Size / weight | Tailwind | Use |
|---|---|---|---|
| Page title | 18–20px / 600–700 | `text-lg`–`text-xl font-semibold` | One per screen |
| Title | 16px / 600 | `text-base font-semibold` | Dialog titles, card titles |
| Body | 14px / 400, line height 1.6 | `text-sm` | Default text, table cells |
| Label | 14px / 500 | `text-sm font-medium` | Buttons, tabs, field labels |
| Caption | 12px / 400 | `text-xs` | Helper text, timestamps |
| Micro | 11px / 500 | `text-[11px]` | Eyebrows, chart legends. The smallest size allowed |

Existing `text-[10px]` usages are below the minimum; raise them to 11px when the file is touched.

### Landing scale

The landing uses the `display`, `headline`, `body`, and `label` roles in the frontmatter. See the Landing section.

## Layout

Product screens use a 16px side gutter on mobile and 24px from `sm`. The dashboard has a sidebar on desktop and a bottom tab bar on mobile; the tab bar sits at `z-50`, so overlays use `z-[60]`. Interactive targets are at least 32px, and 40px or more for primary actions. Respect the iPhone home indicator with `safe-area-bottom` on anything pinned to the bottom edge.

## Shapes

| Role | Radius | Tailwind |
|---|---|---|
| Small controls, icon buttons, chips | 8px | `rounded-lg` |
| Buttons, inputs, cards | 12px | `rounded-xl` |
| Dialogs and sheets | 16px | `rounded-2xl` |
| Pills, avatars | full | `rounded-full` |

The landing keeps its own slightly different measured radii (see frontmatter `control`, `screen`, `stock-card`, `stage`).

## Elevation & Depth

The product is flat. Cards separate with a 1px `border`, not shadow. Only floating layers get a shadow: dialogs and sheets use `shadow-xl` over a `black/40` scrim; the floating feedback button uses `shadow-lg`.

## Components

Shared components live in `components/ui/`. They follow the shadcn pattern: the source is in the repository and styled with the tokens above. Prefer them over hand-written equivalents.

### Buttons — `components/ui/button.tsx`

| Variant | Look | Use |
|---|---|---|
| `default` | Indigo fill, white text | The one main action in a view |
| `secondary` | Lavender fill, indigo text | Supporting action such as "원문 보기" |
| `outline` | White with border | Neutral or cancelling action |
| `ghost` | No fill until hover | Low-emphasis and toolbar actions |
| `destructive` | Red fill | Irreversible actions |
| `link` | Text only | Inline navigation |

Sizes: `default` 40px, `sm` 32px, `lg` 48px, `icon` 32px square. Disabled buttons drop to 40% opacity. Every button shows a 2px focus ring. Use one `default` button per view.

### Dialogs and sheets — `components/ui/dialog.tsx`

There is one overlay pattern: a **bottom sheet on mobile that becomes a centred dialog from `sm`**. It is built on Radix Dialog, which provides focus trapping, Escape to close, scrim click to close, and background scroll lock; do not re-implement those by hand.

- `DialogContent` takes `size`: `sm` (384px), `md` (448px), `lg` (672px, default). Maximum height is 85dvh on mobile.
- `DialogHeader` renders the title with a close button, plus an optional `eyebrow` above and `description` below. Every dialog needs a title.
- `DialogBody` is the scrolling region. `DialogFooter` holds actions and stays visible.

Used by `ArticleModal`, `StockChartModal`, `WatchlistChartModal`, `FeedbackButton`, and the landing's `PwaInstallButton`. The quiz confirmation and `QuizArticleSheet` still use the native `<dialog>` element and are due to move to this component.

### Loading — `components/ui/loading-icon.tsx`

The arch motif pulse. Colour it with `text-primary`. Pair it with screen-reader text inside a `role="status"` region.

### Screen pattern — market study (`/dashboard/history`)

This is the reference screen. New product screens follow its patterns.

- **Title is the main control.** The date picker is the page title (20px mobile, 24px desktop, bold). There is no breadcrumb and no repeated date; the sidebar or tab bar already says where the user is.
- **No card around the main content.** Lists and tables sit directly on the page and separate with 1px `border/60` hairlines and spacing.
- **Mobile is a list, desktop is a table.** Below `sm`, each stock is a list item: name (16px semibold) with closing price, signed rate and turnover beneath in 12px text on the left, trading value (16px semibold) with its label beneath on the right. Trading value is the most important number on this screen and takes the prominent slot; price is secondary. The signed rate sits beside the price it describes, never under the trading value. Each stock carries its trading-value rank (indigo number before the name); the rank does not change when the list is sorted by another column. From `sm`, the same data is the 7-column table. Both come from one component and one data mapping (`components/ProcessedResultTable.tsx`).
- **Sorting.** Desktop sorts from column headers; an arrow appears on the active column. Mobile sorts from a row of pill chips; the active chip is filled with `foreground`.
- **Supporting content sits in a quiet block.** On mobile, the record (badge, keyword, text, source links) is a `bg-muted/60` block with 12px radius under the item, not a bordered card.
- **Emphasis is a pill, not a cell fill.** High trading value (orange), high turnover (purple), and a rate of 15% or more (`rise-surface`) are shown as small rounded pills behind the number.
- **Trading-value level is a row of orange dots**, one per 1,000억 up to five, beside the trading value. It replaces the old single 2,000억 highlight.
- **Key lines stand out.** A line in a rise reason that starts with `★` is the author's own highlight; it renders as a soft amber block with one star.
- **Missing reasons are stated.** A stock with no reason, related news, or business profile shows a muted "이유 미확인" instead of a blank.
- **Theme grouping (preview).** When grouped, each theme gets a `bg-muted/60` band with a colour dot, the stock count, and the trading-value subtotal; groups are ordered by subtotal. The classification currently comes from `lib/themePreview.ts`, a temporary keyword rule, and the control is labelled "미리보기".
- **Sheet view (preview).** An alternative look modelled on the author's own daily spreadsheet: bordered grid, green header row, a sequential number column, pastel theme tints on the keyword column, a tinted subtotal row under each theme, and `*` per 1,000억 before the keyword. It deliberately uses the spreadsheet's raw colours rather than the tokens, and scrolls sideways on narrow screens.
- **Share of the market (preview).** When the day's KOSPI and KOSDAQ totals are known, a two-cell summary under the heading shows the market's total trading value and the share this list takes; each theme band and each stock shows "시장의 N%". The denominator is KOSPI plus KOSDAQ combined. Totals currently come from a snapshot file, `data/market-trading-value.json`.
- **Rates always carry a sign and a direction colour**, and all numbers use `tabular-nums`.
- **Korean text uses `break-keep`** so lines do not break inside a word.
- **Loading is a skeleton** shaped like the content (`animate-pulse` blocks in `bg-muted`), not a spinner, when the layout is known in advance.
- **Empty states say what happened and what to do next**: a soft icon tile, one 15px semibold line, one muted hint.
- **Filter and segment controls are pills**: 32px high, fully rounded, `bg-muted` at rest and `bg-foreground text-background` when selected.

### Not yet shared

Inputs, tabs, badges, tables, the calendar, and toasts are still written per screen. Add them to `components/ui/` using these tokens as each is next worked on.

## Landing

This section applies only to the public landing route (`/`) implemented by `components/landing/NotifoldLanding.tsx` and its CSS module.

The direction follows the user's Notifold reference: a white, airy page with animated UI on the left and bold Korean explanatory copy on the right. StockExtract keeps its own indigo identity, content, and product examples.

Key characteristics:
- Generous whitespace and a repeated preview-plus-copy composition.
- Dark Korean headings, quiet supporting text, and focused indigo actions.
- Resolution-independent HTML/CSS demonstrations based on actual service screens.

### Colors

#### Primary

StockExtract indigo anchors the brand, links, final action, and confirmation icon. Darker indigo provides hover feedback. The lavender focus outline remains visible against the white page.

#### Neutral

White is the page and inner-card surface. Ink carries headings. Muted grays carry supporting copy and provenance labels. Pale gray stages separate demonstrations from the page without enclosing the surrounding copy. Keyword lavender is a local information treatment. The individual stock icons retain their observed blue, purple, green, and orange identities; these are illustrative accents rather than additional brand colors.

### Typography

The landing uses Pretendard like the rest of the product. Bold Korean headlines use tight tracking and `word-break: keep-all` to keep phrases readable.

The display role belongs to the hero, the headline role to feature headings, the body role to feature explanations, and the label role to action links. Final CTA headings use (36px), weight (750), line height (1.5), and tracking (-0.035em). Small provenance labels remain subordinate to the product story.

### Layout

Navigation, main content, and footer share a centered maximum width of (1000px). Desktop sections pair a (420px) preview column with flexible text, using the frontmatter column gap. The header is (74px) high; the hero has a (500px) minimum height. Feature sections use the frontmatter section spacing.

At widths up to (1090px), side margins become (40px), the column gap becomes (48px), and hero type becomes (36px). At widths up to (760px), margins become (24px), sections stack in one column with copy first, and section spacing becomes (90px). The mobile hero uses (34px) type and (1.4) line height; feature headings use (27px). The first navigation link is hidden on mobile. At widths from (1400px), non-hero section margins increase to (160px).

### Elevation & Depth

The page is flat; soft shadows belong to simulated UI and captured-screen frames. Stock cards use `0 10px 24px -12px #32374742`. Screen frames use `0 14px 30px -20px #32374740`. The reason sheet uses `0 15px 35px -22px #32374745`. The completion pill uses `0 7px 18px -8px #373c4245`. Do not spread these shadows to surrounding marketing copy.

### Shapes

Soft stage corners contain tighter inner cards and screen windows. The frontmatter records the implemented radii. The hero stage reduces to (20px) corners on mobile. The brand icon uses (7px) corners, the final CTA icon uses (17px), and the confirmation pill uses (30px). Captured screens are clipped inside their windows; the page itself has no enclosing card.

### Components

#### Actions and navigation

The final primary link has indigo fill, white text, and a small directional arrow. Hover darkens it and lifts it by (2px), with (0.2s) transitions. Text links use the brand accent with a darker hover. All landing anchors and buttons have a (3px) focus outline with (6px) offset. Preserve the skip-to-content link and the concise header links. Primary actions lead to `/login`.

#### Preview cards and keyword

Stock cards pair colored initial icons with compact names, reasons, and tabular percentage values. The reason sheet uses a compact keyword tag, two numeric facts, a summary, and a button that reveals the captured article title. This disclosure uses `aria-expanded`; it is a demonstration, not an external article link.

#### Captures and provenance

`public/landing/history.jpg`, `quiz.jpg`, and `quiz-selected.jpg` were captured from the actual locally running application on 2026-11-01. The displayed market data is dated 2026-10-30. Identity headers were cropped. These captures are provenance references only. History and quiz now render native HTML/CSS text and SVG icons to remain sharp on retina displays; the hero and reason sheet reconstruct UI from captured values. Preserve the on-page distinction between actual service screens and reconstructed interactive previews. These assets are dated examples, not live market output.

#### Motion and interaction

Stock organization and its confirmation loop over (12s); history scrolling loops over (16s); quiz selection border and fill animate over (9s). History scroll distance is derived from content height and the viewport (475px desktop, 435px mobile), keeping the last row reachable. The shared pause control pauses CSS animations. Clicking the quiz switches to manual selection; its reset control resumes automatic demonstration. The article disclosure transitions over (0.35s).

Under `prefers-reduced-motion: reduce`, animations and transitions stop, stock cards are aligned, and the confirmation remains visible. The animation control is hidden in that mode; manual quiz and article controls remain usable. Do not make motion necessary to understand the product.

## Do's and Don'ts

- **Do** take colour, typeface, and tone from the brand layer on every route.
- **Do** use the tokens and `components/ui/` components; do not introduce raw palette classes outside the listed exceptions.
- **Do** keep rise red and fall blue, with a sign or arrow beside the colour.
- **Do** keep confirmed rise reasons, related news, and user notes distinct by icon, label, and colour.
- **Do** preserve clear Korean phrasing, visible keyboard focus, and reduced-motion behaviour.
- **Do** preserve the landing's white, spacious Notifold-style composition, its pause control, and accurate capture dates and reconstructed-preview disclosures.
- **Don't** bring the landing's type sizes or 140px section spacing into the product.
- **Don't** add a second typeface or a second accent colour.
- **Don't** present a DART business profile as a dated event, or a news item's timing as the cause of a rise.
- **Don't** describe dated screenshots or reconstructed UI as live data.
- **Don't** imply that the mobile app is available; the current landing says it is in preparation.
- **Don't** overwrite or restyle away user-written annotations, or remove the market-study table.
