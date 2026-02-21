# Design System

## Colors

| Name | Hex | Usage |
|------|-----|-------|
| Background | `#faf8f3` | Page background (bone/cream) |
| Foreground | `#141515` | Text color (near black) |
| Primary | `#0b6cff` | Links, buttons, interactive elements |
| Secondary | `#f2ead9` | Active tabs, accents (beige) |
| Success | `#00c950` | Positive states, mastered words |
| Warning | `#ff9224` | In-progress states, studying words |
| Destructive | `#fb2c36` | Errors, delete actions |

## Typography

All typography uses **Inter** font with `line-height: 1.35`.

Larger styles (20px+) use **Inter Display** via `font-variation-settings: "opsz" 32`.

| Class | Size | Weight | Letter-spacing |
|-------|------|--------|----------------|
| `.text-page-header` | 40px | Semibold (600) | -2.5% |
| `.text-xxl-semibold` | 32px | Semibold (600) | -2.5% |
| `.text-xl-semibold` | 24px | Semibold (600) | -2.5% |
| `.text-large-semibold` | 20px | Semibold (600) | -2% |
| `.text-regular-semibold` | 15px | Semibold (600) | -1.5% |
| `.text-regular-medium` | 15px | Medium (500) | -1.5% |
| `.text-small-semibold` | 14px | Semibold (600) | -1% |
| `.text-small-medium` | 14px | Medium (500) | -1% |
| `.text-small-regular` | 14px | Regular (400) | -0.5% |
| `.text-xs-medium` | 13px | Medium (500) | -1% |

## Corner Radius

| Variable | Value |
|----------|-------|
| `--radius-s` | 8px |
| `--radius-m` | 12px |
| `--radius-l` | 16px |

## Max Widths

| Variable | Value | Usage |
|----------|-------|-------|
| `--max-width-s` | 840px | Narrow content |
| `--max-width-m` | 1080px | Default content |
| `--max-width-l` | 1280px | Wide content |

## Status Colors

| Status | Background | Text Color |
|--------|------------|------------|
| Mastered | `#e6f9f0` | `#00c950` |
| Studying | `#fff6da` | `#ff9224` |
| Not Started | `#f5f5f5` | `rgba(20, 21, 21, 0.5)` |
