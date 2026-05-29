# Design Direction

## Product Feel

UFO Files Archive should feel like a minimalist research console for public
records: fast, source-forward, interactive, and calm. It can use cyan, emerald,
and magenta accents for orientation, but the interface should avoid spectacle,
conspiracy aesthetics, and decorative noise.

## Current Interaction Priorities

- Explore: fast search, year filtering across incident and release dates, and
  compact result cards.
- Releases: sync deltas, release waves, known file counts, and fallback
  provenance in one place.
- Timeline: refined release and incident chronology with clearer grouping and
  density controls.
- Map: dark cartographic styling that matches the archive palette, with a
  sidecar list for records without coordinates.
- Graph: interactive relationship view for significant files and clusters.
- Case detail: provenance first, then media/source actions, related files, and
  graph/map affordances.

## Visual System Notes

- Use near-black surfaces, thin borders, and restrained glow only around active
  data points.
- Prefer segmented controls, compact toolbars, and side panels over large
  marketing sections.
- Cards are for repeated records and panels; do not nest cards inside cards.
- Motion should clarify selection, filtering, and focus, and must respect
  reduced-motion preferences.

## Implemented UI Pass

- Timeline now prioritizes release waves, with side filters for release, media
  type, and text search, plus compact rows that keep source actions visible.
- Map now uses a code-native projected map canvas with matching dark archival
  styling, mapped/unmapped counts, selected-case details, and an unmapped record
  side list.
- Graph uses the same dense panel language and reserves significant nodes from
  each release so new release waves stay visible.

## Next UI Pass

The next full design pass should refine home, explore, case detail, and graph
microinteractions around the same console pattern. Preserve the official-source
policy and visible sync status in every concept.
