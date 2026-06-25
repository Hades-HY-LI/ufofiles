# Design Direction

## Product Feel

UFO Files Archive should feel like a vivid public-records desk: fast,
source-forward, interactive, and credible. The prior dark archival console has
been replaced by a Vercel-inspired public-data direction: neutral white and
soft-gray surfaces, crisp black text/actions, restrained blue accents, thin
borders, and measured interaction states. The product should still avoid spectacle,
conspiracy aesthetics, alien imagery, and decorative noise.

## Current Interaction Priorities

- Explore: fast search, year filtering across incident and release dates, and
  compact result cards.
- Releases: sync deltas, release waves, known file counts, and fallback
  provenance in one place.
- Timeline: scroll-driven release chronicle with sticky release stages,
  mini-scroll navigation, file histograms, expandable rows, and source actions.
- Map: preserve the existing map logic and detail behavior, but place it in the
  brighter site shell so it fits the revamp.
- Graph: interactive relationship view for significant files and clusters.
- Case detail: provenance first, then media/source actions, related files, and
  graph/map affordances.

## Visual System Notes

- Use bright page surfaces, clean separators, compact control bands, and vivid
  color only where it improves scanning or orientation. Prefer neutral defaults
  and high-contrast active states over saturated UI chrome.
- Prefer segmented controls, compact toolbars, release navigators, and side
  panels over large marketing sections.
- Cards are for repeated records and panels; do not nest cards inside cards.
- Motion should clarify selection, filtering, and focus, and must respect
  reduced-motion preferences.

## Approved Revamp Direction

- Keep Explore and Timeline as separate pages because they serve different
  browsing modes.
- Explore uses a dense research-desk pattern: filters plus adaptive file
  list/card modes in the shared page width, without a right preview rail or
  squeezed cards.
- Timeline uses the "Chronicle Scroll" pattern: release waves as scroll stages,
  histograms that summarize files by media type, expandable file drawers, and a
  compact right-side release rail.
- Case detail remains provenance-first, with media/source actions and related
  file navigation.
- Releases becomes a readable release/change tracker around sync metadata.
- Graph and Map retain their data logic and interactive behavior while adopting
  the lighter shared shell.

## Next UI Pass

Refine microinteractions after the revamp lands: keyboard focus states, reduced
motion handling, row expansion polish, and mobile density controls. Preserve the
official-source policy and visible sync status in every concept.
