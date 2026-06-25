# Design System

## Direction

The approved direction is a high-end public archive: serious, legible, dense,
and restrained. It takes cues from Vercel/Geist-style product interfaces:
neutral surfaces, crisp borders, strong typography, and deliberate active
states. The archive should feel like a modern public-data interface, not a
science-fiction game or conspiracy board.

## Principles

- Source-forward: official URLs, dates, and retrieval metadata are visible.
- Dense but calm: prioritize scanability and comparison.
- Minimal decoration: use layout, typography, subtle dividers, and data-driven
  interaction instead of effects.
- Neutral language: avoid sensational labels.
- Mobile complete: provenance and filters must remain available on small screens.

## Palette

Use a neutral bright base with restrained, purposeful accents.

- Background: `#FAFAFA`
- Soft band: `#F5F5F5`
- Surface: `#FFFFFF`
- Raised surface: `#FAFAFA`
- Border: `#E5E5E5`
- Primary text: `#09090B`
- Secondary text: `#666666`
- Muted text: `#A3A3A3`
- Primary action: `#09090B`
- Accent blue: `#0068D6`
- Success green: `#007A3D`
- Accent amber: `#A16207`
- Accent magenta: `#C026D3`
- Error red: `#D92D20`

Avoid saturated default surfaces, gradient dominance, glowing orbs, heavy neon,
beige archival paper themes, and decorative bokeh.

## Typography

- Use a legible sans-serif for UI.
- Use a tabular or mono style only for IDs, timestamps, coordinates, and source metadata.
- Keep page headings compact. Reserve large type for the home page title and
  timeline stage labels only.
- Do not use negative letter spacing.

## Layout

- Prefer full-width bands and constrained inner content.
- Use cards only for repeated records, modals, and genuinely framed tools.
- Do not place cards inside cards.
- Keep controls compact and predictable.
- Filters should be usable without hiding the result count or sync status.
- Explore result cards should use auto-fit columns with a useful minimum card
  width; do not add a right preview rail on Explore.

## Components

- Sync banner: status color, short message, last successful sync, source link.
- Navigation: current route must be visually active and expose `aria-current`.
- Case card: title, date, location, category, tags, short summary, source affordance.
- Case detail header: title, official source URL, retrieval timestamp, document links.
- Filter controls: inputs, checkboxes, segmented controls, menus, and compact chips.
- Timeline stage: sticky release label, histogram by media type, visible file
  count, active scroll state, and expandable file rows.
- Timeline mini-scroll: compact right-side release navigator with active
  release, file counts, and jump affordances.
- File drawer: official source URL, media/source actions, metadata, map link,
  graph link, and related file affordances.
- Map fallback list: cases with missing or approximate coordinates remain discoverable.
- Relationship graph: significant nodes, weighted links, clear selected state,
  and a readable side panel explaining why files are related.

## Interaction

- Keyboard navigation must work for search, filters, route links, and documents.
- Hover states should be subtle but clear.
- Status must not rely on color alone.
- Loading and empty states should be plain and factual.
- Scroll-driven timeline states should remain useful without scroll-linked
  animation support; sticky sections and jump links are the baseline.
