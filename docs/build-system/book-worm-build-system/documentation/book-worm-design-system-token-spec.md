# Design System Token Specification

This spec details the variables that define the look and feel of Book Worm. Tokens live in a design system package so that both frontend and documentation share a single source of truth.

## Typography Tokens

- `font-family-display`: a refined serif (e.g. `"Merriweather", serif`).
- `font-family-body`: a clean sans‑serif (e.g. `"Inter", sans-serif`).
- `font-weight-normal`: 400; `font-weight-bold`: 700.
- `font-size-xs` to `font-size-3xl`: 12px to 39px (see Appendix B type scale).
- `line-height-tight`: 1.2; `line-height-normal`: 1.5; `line-height-relaxed`: 1.6.

## Colour Tokens

- Primary neutrals: `neutral-0` (`#FAF8F6`), `neutral-10` (`#F2F0EE`), `neutral-50` (`#CFCBC8`), `neutral-90` (`#3A3530`), `neutral-100` (`#181614`).
- Accent: `accent` (choose deep forest, burgundy or navy). Use as `accent-bg`, `accent-text`, `accent-border` etc.
- State colours: `error` (`#C4564D`), `warning` (`#C28F3F`), `info` (`#5A81A3`). These should be muted.
- Dark mode neutrals: invert neutrals (e.g. `neutral-dark-0` = `#181614`, `neutral-dark-100` = `#FAF8F6`).

## Spacing Tokens

- `space-0`: 0px; `space-0.5`: 2px; `space-1`: 4px; up to `space-12`: 48px. Use multiples of 4px.

## Radius Tokens

- `radius-sm`: 2px; `radius-md`: 4px; `radius-lg`: 8px.

## Shadow Tokens

- `shadow-sm`: `0 1px 2px rgba(0,0,0,0.05)`;
- `shadow-md`: `0 4px 6px rgba(0,0,0,0.1)`;
- Avoid larger shadows.

## Motion Tokens

- `motion-duration-fast`: 150ms;
- `motion-duration-default`: 250ms;
- `motion-timing-function`: `ease-in-out`;
- `motion-distance`: 4px for small slide transitions.

## Layout Tokens

- `max-width-content`: 800px for reading; `max-width-wide`: 1200px for admin tables.
- `breakpoint-sm`: 640px; `breakpoint-md`: 768px; `breakpoint-lg`: 1024px; `breakpoint-xl`: 1280px.

These tokens provide the basis for the design system; components derive their styles from them. Changing a token adjusts the entire application consistently.
