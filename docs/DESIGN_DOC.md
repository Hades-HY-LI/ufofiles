# Design Doc

## Architecture

The MVP is a Next.js static app backed by repo-local JSON. The build should load normalized records from `data/` and render static routes where practical.

```text
war.gov/ufo -> sync script -> data/*.json -> Next.js build -> Vercel static app
```

## Route Model

- `/`: overview and entry points.
- `/explore`: list, search, and filters.
- `/case/[id]`: detail route generated from `data/cases.json`.
- `/timeline`: chronological view.
- `/map`: coordinate-based view.
- `/about`: source policy and archive limitations.

## Data Flow

1. Every two weeks, or when a release is announced, a maintainer follows
   `docs/MANUAL_SYNC.md` from a dated branch.
2. `npm run sync:war` fetches public `war.gov/ufo` pages and files.
3. The sync normalizes records into stable JSON and writes freshness metadata.
4. The maintainer validates the data and reviews the generated diff in a PR.
5. `npm run build` validates and reads the approved JSON.
6. Vercel deploys the static site after the data PR is merged.

## Rendering Strategy

- Prefer static rendering for list and case detail pages.
- Keep client-side JavaScript focused on search, filtering, timeline interaction, and map interaction.
- Case pages should remain useful if interactive controls fail.

## Error States

- Missing data file: build should fail with a clear message.
- Empty case list: app should render an empty archive state and show sync context.
- Stale data: app should render normally with a warning banner.
- Failed sync: previous good data should remain deployable, with failure status recorded.

## Banner Behavior

The banner reads `data/sync-metadata.json`.

- `fresh`: no banner required, or a compact "updated" timestamp may be shown.
- `stale`: show an amber banner with last successful sync.
- `partial`: show an amber banner explaining that some official records may be missing.
- `failed`: show a red banner with last successful sync and failed attempt time.
- `paused`: show a neutral banner explaining that sync is intentionally paused.

## Accessibility

- Use semantic headings and landmarks.
- Preserve keyboard access for filters, case links, tabs, and map fallback lists.
- Maintain high contrast in the dark UI.
- Do not rely on color alone for status.

## Performance

- Static JSON should stay compact enough for fast initial load.
- Use derived indexes if search becomes slow.
- Avoid loading map code on non-map routes.
