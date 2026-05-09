# Design System

## Direction

The approved direction is dark archival: serious, legible, dense, and restrained. The archive should feel like a public research terminal, not a science-fiction game or conspiracy board.

## Principles

- Source-forward: official URLs, dates, and retrieval metadata are visible.
- Dense but calm: prioritize scanability and comparison.
- Minimal decoration: use layout, typography, and subtle borders instead of effects.
- Neutral language: avoid sensational labels.
- Mobile complete: provenance and filters must remain available on small screens.

## Palette

Use a near-black base with muted archival accents.

- Background: `#0B0F12`
- Surface: `#12181D`
- Raised surface: `#182027`
- Border: `#2A343D`
- Primary text: `#E6EDF3`
- Secondary text: `#9AA7B2`
- Muted text: `#6F7C86`
- Accent cyan: `#76D1D8`
- Accent amber: `#D6A94A`
- Error red: `#D66A5C`
- Success green: `#7BAE7F`

Avoid purple-blue gradients, glowing orbs, heavy neon, beige archival paper themes, and decorative bokeh.

## Typography

- Use a legible sans-serif for UI.
- Use a tabular or mono style only for IDs, timestamps, coordinates, and source metadata.
- Keep page headings compact. Reserve large type for the home page title only.
- Do not use negative letter spacing.

## Layout

- Prefer full-width bands and constrained inner content.
- Use cards only for repeated records, modals, and genuinely framed tools.
- Do not place cards inside cards.
- Keep controls compact and predictable.
- Filters should be usable without hiding the result count or sync status.

## Components

- Sync banner: status color, short message, last successful sync, source link.
- Case card: title, date, location, category, tags, short summary, source affordance.
- Case detail header: title, official source URL, retrieval timestamp, document links.
- Filter controls: inputs, checkboxes, segmented controls, and menus.
- Timeline item: year/date, title, location, category, source indicator.
- Map fallback list: cases with missing or approximate coordinates remain discoverable.

## Interaction

- Keyboard navigation must work for search, filters, route links, and documents.
- Hover states should be subtle but clear.
- Status must not rely on color alone.
- Loading and empty states should be plain and factual.

