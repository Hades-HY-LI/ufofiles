# Test Plan

## Goals

Testing should prove that the static archive builds, renders, preserves official provenance, and communicates sync freshness.

## Expected Commands

```bash
npm run validate:data
npm run build
npm run lint
npm test
```

During a manual data sync, follow `docs/MANUAL_SYNC.md` and run:

```bash
npm run discover:war-bundles
npm run sync:war
npm run validate:data
npm run lint
npm run typecheck
npm test
npm run build
```

## Data Tests

- `data/cases.json` is valid JSON.
- `data/releases.json` is valid JSON.
- Every case has stable `id`, `title`, `sourceUrl`, `releaseDate`, and `confidence`.
- Official URLs use the approved `war.gov/ufo` source policy.
- CSV-derived data preserves document, image, video, and audio media types.
- Unknown fields use `null` instead of invented values.
- IDs are unique.
- Dates are ISO formatted when present.
- `data/sync-metadata.json` uses an allowed `status` value.
- `npm run validate:data` confirms release counts, approved source hosts,
  metadata references, official bundle registries, and relationship graph
  integrity.

## Build Tests

- Static build succeeds with normal data.
- Static build fails clearly when required JSON is missing or malformed.
- Case detail route generation handles every case ID.
- Empty data renders a useful empty state.

## UI Tests

- Home page shows archive identity and sync state.
- Explore page supports search and filters.
- Case pages show official source links and retrieval timestamps.
- Timeline sorts records chronologically.
- Map shows coordinate records and keeps non-coordinate records discoverable.
- About page states the official-source policy.

## Accessibility Tests

- Keyboard navigation reaches filters, case links, document links, and banner actions.
- Focus states are visible.
- Text contrast works on the dark archival palette.
- Status is conveyed with text, not color alone.

## Regression Checks

Run these before publishing a manual data update:

```bash
npm run discover:war-bundles
npm run sync:war
npm run validate:data
npm run lint
npm run typecheck
npm test
npm run build
```

Require `data/sync-metadata.json` to report `fresh` before continuing. A
`partial` or `failed` attempt must not be committed or deployed.

Then manually spot-check:

- `/`
- `/explore`
- `/timeline`
- `/map`
- `/about`
- One representative `/case/[id]`
