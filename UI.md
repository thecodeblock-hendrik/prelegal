# UI refresh plan (KAN-10)

Visual-only refresh to the corporate palette. No changes to functionality, routes, API calls or element ids (`section-*` in `DocumentPreview` drives preview scrolling).

## Current styling approach

- Tailwind CSS 4, configured CSS-first in `frontend/app/globals.css`: `@theme` colour tokens (old brand: yellow accent, light-blue primary, purple secondary, navy, `#888` muted) and `@utility` classes `input`, `btn`, `btn-submit`, `btn-primary`, `card`.
- Components mix those with raw Tailwind palette classes (`slate-*`, `red-*`, `amber-*`, `white`) and default sizes (`text-xs` to `text-4xl`, `rounded-md` to `rounded-2xl`).
- Geist font from `next/font/google` (downloaded from Google at build time).
- Gaps: `#888` muted text is 3.5:1 on white (fails AA); buttons have no focus or active state; alerts are styled three different ways; delete uses the unstyled `window.confirm`; at 375px the dashboard overflows to 464px (`<main>` with `mx-auto` inside the flex-column `body` sizes to its content).

## Approach

CSS-first, matching the existing pattern: every colour, font size, radius and shadow is a token in `@theme`, with Tailwind's defaults reset (`--color-*: initial` and so on) so a stray `slate-200` or `text-sm` produces no CSS. Shared components are `@utility` classes that work on both `<button>` and `<Link>`. The only new React component is `ConfirmDialog` (native `<dialog>`), because a modal needs behaviour.

## Files to change

| File | Change |
| --- | --- |
| `frontend/app/globals.css` | Token set, base styles, shared utilities |
| `frontend/app/layout.tsx` | Inter via `next/font/local` |
| `frontend/app/fonts/` | `InterVariable.woff2` and its OFL licence (new) |
| `frontend/components/ConfirmDialog.tsx` | Styled confirm modal (new) |
| `frontend/components/AppHeader.tsx`, `Logo.tsx`, `Disclaimer.tsx` | Navigation, logo and warning alert on tokens |
| `frontend/app/page.tsx` | Sign in / sign up |
| `frontend/app/documents/page.tsx` | Dashboard; delete confirm becomes `ConfirmDialog` |
| `frontend/app/draft/page.tsx`, `components/DocumentChat.tsx`, `components/DocumentPreview.tsx` | Drafting screen and document templates |
| `CLAUDE.md` | Colour scheme section points to the tokens |

## Token set

### Colour

| Token | Value | Use |
| --- | --- | --- |
| `primary` | `#0B2545` | Header, main buttons, active states, headings |
| `primary-hover` / `primary-active` | `#1D3B63` / `#071A33` | Button states |
| `primary-soft` | `#EEF2F7` | Selected and pressed light surfaces |
| `on-primary-muted` | `#C8D1DD` | Secondary text on the navy header and panel |
| `secondary` | `#0F766E` | Secondary actions, highlights (progress) |
| `secondary-hover` / `secondary-active` | `#0D6560` / `#0B5853` | Button states |
| `accent` | `#2563EB` | Links, focus indicators |
| `accent-hover` | `#1D4ED8` | Link hover |
| `background` | `#F5F7FA` | Page background |
| `surface` | `#FFFFFF` | Cards, modals, tables |
| `border` | `#D9DEE5` | Dividers, card edges |
| `border-strong` | `#8A94A3` | Input borders (3:1 for controls) |
| `text` | `#1A2433` | Body text |
| `muted` | `#5B6676` | Secondary text (replaces `#888`) |
| `success` | `#15803D` | Success alerts |
| `warning` / `warning-soft` | `#B45309` / `#FFFBEB` | Warning alerts (disclaimer) |
| `error` / `error-soft` | `#B91C1C` / `#FEF2F2` | Errors, destructive buttons |
| `error-hover` / `error-active` | `#991B1B` / `#7F1D1D` | Destructive button states |

Hover, active, soft, `border-strong`, `muted` and `on-primary-muted` are additions to the ticket palette, needed for interaction states and AA contrast.

### Typography

Inter (self-hosted variable font), fallback `system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`. Weights 400 body, 500 labels and buttons, 600 headings. The document preview keeps a serif face so it reads as a printed agreement.

| Token | Size / line height | Use |
| --- | --- | --- |
| `text-caption` | 12px / 1.5 | Helper text, captions, disclaimer |
| `text-body` | 14px / 1.5 | Body, inputs, buttons |
| `text-heading` | 16px / 1.25 | Section headings |
| `text-title` | 20px / 1.25 | Page titles |
| `text-display` | 24px / 1.25 | Main headings (sign in, document title) |

`tabular-nums` on tables and counts ("3 of 9 sections").

### Spacing, radius, shadow

- Spacing: Tailwind's 4px scale, limited to steps 1, 2, 3, 4, 5, 6, 8, 10, 12 and 16. Pages use `px-4` on phones and `px-6` from `sm`.
- Radius: `sm` 4px, `md` 6px (controls), `lg` 8px (cards, modals), `full` (pills, progress).
- Shadow: `card` (subtle lift), `modal` (dialog).

## Shared components (`@utility`)

- Buttons: `btn-primary`, `btn-secondary`, `btn-danger`, `btn-ghost`, each with hover, active, focus-visible and disabled states.
- `link` for text links; `input` with hover, focus, disabled and placeholder states.
- `card`, `data-table`, `alert-warning`, `alert-error`, `nav-link` (with `aria-current` active state), `page` (page container, fixes the 375px overflow).
- `ConfirmDialog`: Cancel is focused first; Esc and backdrop click cancel.

## Contrast (WCAG 2.1 AA, computed)

| Pair | Ratio |
| --- | --- |
| Text on surface / background | 15.62 / 14.56 |
| Muted on surface / background | 5.82 / 5.42 |
| Accent links on surface / background | 5.17 / 4.82 |
| White on primary / secondary / error | 15.39 / 5.47 / 6.47 |
| Warning on warning-soft, error on error-soft | 4.84, 5.91 |
| `on-primary-muted` on primary | 9.98 |
| Input border (`border-strong`) on surface | 3.07 (3:1 for controls) |
| Focus ring: accent on surface, white on primary | 5.17, 15.39 |

The accent ring on the navy header is only 2.98:1, so focus rings on dark surfaces are white.

## Breakpoints

Checked at 1920, 1366, 768 and 375px. Content is capped at 80rem (draft) and 64rem (dashboard); the draft page is two columns from 1024px; on phones, page padding drops to 16px, the preview padding shrinks, and the signature table scrolls inside its own box.

## Delivery

1. This plan.
2. Tokens, font and shared utilities.
3. Shared components: header, logo, disclaimer, `ConfirmDialog`.
4. Screens one at a time: sign in, dashboard, drafting page.
5. Before and after screenshots in `docs/screenshots/KAN-10/`.
