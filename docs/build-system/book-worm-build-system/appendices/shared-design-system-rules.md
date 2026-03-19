# Appendix B: Shared Design System Rules

## Type Scale

Use a modular scale based on a 1.25 ratio (minor third) for typography. Example sizes:

- `xs`: 0.75rem (12px)
- `sm`: 0.875rem (14px)
- `base`: 1rem (16px)
- `lg`: 1.25rem (20px)
- `xl`: 1.563rem (25px)
- `2xl`: 1.953rem (31px)
- `3xl`: 2.441rem (39px)

Headings use larger sizes with appropriate line heights (e.g. 1.2 for headings, 1.5 for body).

## Spacing Scale

Use a 4‑point grid for spacing. Base units:

- `0.5`: 2px
- `1`: 4px
- `2`: 8px
- `3`: 12px
- `4`: 16px
- `5`: 20px
- `6`: 24px
- `8`: 32px
- `10`: 40px
- `12`: 48px

Margins and padding should be multiples of these units. Avoid arbitrary values.

## Colour Tokens

Define a restrained palette with neutrals and one accent:

- **Neutral:** off‑white (`#FAF8F6`), light grey (`#F2F0EE`), medium grey (`#CFCBC8`), dark grey (`#3A3530`), near‑black (`#181614`).
- **Accent:** choose a single signature colour such as deep forest green (`#2F4B32`), dark burgundy (`#4A1F2B`) or muted navy (`#1F365C`). Use accent colour sparingly for links, active states and highlights.
- **Informational states:** use subtle hues (e.g. soft blue for information, soft red for errors) that blend with the neutrals. Avoid high‑saturation colours.

Provide dark mode equivalents: invert neutrals and adjust accent to maintain contrast.

## Radii and Shadows

- Corners: Use `2px` or `4px` radii on cards and buttons. Avoid large rounded corners that evoke a playful aesthetic.
- Shadows: Use subtle shadows for elevation. For example: `shadow-sm` (0 1px 2px rgba(0,0,0,0.05)), `shadow-md` (0 4px 6px rgba(0,0,0,0.1)). Do not overuse shadows.

## Motion

- Keep animations minimal. Use fade‑ins and slide transitions with durations around 200–300ms.
- Avoid bouncy or spring animations. Motion should feel like pages turning or drawers sliding.
- Use reduced motion preference when `prefers-reduced-motion` is enabled.

## Component Tone

- Cards should have generous padding, subtle borders or dividers and minimal chrome.
- Buttons should have clear hierarchy: primary (accent colour, filled), secondary (neutral background, border), tertiary (text button with underline on hover).
- Form fields should be clearly labelled and provide error messages inline. Use spacing to separate groups.
- Navigation should be sparse and typographic. Active states emphasised with underline or accent colour.

## Public vs Admin

Public pages lean into editorial typography and generous spacing. Admin pages are denser but still maintain clarity and use the same palette. Avoid drastically different styles between them; consistent branding is paramount.
