# Sync Runbook

## Purpose

Sync keeps the static JSON archive aligned with the official public source at `war.gov/ufo`.

## Command

Project sync command:

```bash
npm run discover:war-bundles
npm run sync:war
npm run validate:data
```

Recommended release flow:

```bash
npm run discover:war-bundles
npm run sync:war
npm run validate:data
npm run build
npm run lint
npm test
```

## Source Policy

- Fetch only public pages and public files from `https://www.war.gov/ufo/` and official linked files under the same source policy.
- Prefer the official War.gov CSV export at `https://www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv` when reachable.
- Do not ingest mirrors, social posts, community spreadsheets, or news articles as case facts.
- Preserve official URLs and retrieval timestamps.
- Respect robots, rate limits, and transient failures.
- Do not bypass access controls or download non-public material.

## Sync Outputs

- `data/cases.json`: normalized cases.
- `data/releases.json`: official PURSUE release records.
- `data/sync-metadata.json`: latest sync health and banner inputs.
- War.gov CSV export: primary official source for row-level records, including documents, images, videos, and audio.
- `data/war-ufo-manifest.json`: operator-maintained official URL fallback used when `war.gov/ufo` blocks command-line/server fetches.
- `data/official-release-pages.json`: official portal, release search, and release article pages scanned before sync.
- `data/official-bundles.json`: official linked release bundles. Automation can read ZIP central-directory metadata by HTTP range request when the bundle host allows it.

Run `npm run validate:data` after discovery and sync. It verifies JSON schemas,
unique IDs, release counts, approved official hosts, sync metadata references,
and that the derived relationship graph has valid nodes, edges, and reasons.

## Discovery Pass

`npm run discover:war-bundles` runs before `npm run sync:war` in GitHub
Actions. It scans only configured official War.gov pages and release pages found
from official War.gov UAP search results. When it finds approved ZIP bundle
links, it updates `data/official-bundles.json`; it does not ingest mirrors,
social posts, community catalogs, or search-engine-only results.

If official pages return `403`, the discovery pass leaves the existing registry
in place and prints a warning. This keeps scheduled runs useful without treating
a blocked War.gov edge response as evidence that no new official files exist.

## Manifest Fallback

The official site is publicly browsable, but its Akamai edge may return `403` to command-line or server-side fetches. When that happens, `npm run sync:war` falls back to `data/war-ufo-manifest.json`.

The sync order is:

1. Official War.gov CSV export.
2. Live `war.gov/ufo` page discovery.
3. `data/war-ufo-manifest.json`.
4. `data/official-bundles.json`.

The manifest must represent the Release file table, not the evidence-photo carousel. Release 01 currently normalizes 161 top-level file rows: PDFs, top-level images, and videos. Extracted images from inside PDFs should not become case records.

The manifest must contain only official `war.gov` URLs, official DVIDS video URLs linked by the release materials, or official URLs linked from `war.gov/ufo`. It is acceptable for a maintainer to update this file after visually confirming new public links in a normal browser. The sync script then normalizes those links into `data/cases.json`.

Fallback sync behavior:

- CSV or live fetch succeeds: normalize discovered official records and mark status `fresh`.
- Live fetch fails but manifest or official linked bundles have records: normalize fallback records only for release dates not already represented in `data/cases.json`, then mark status `partial` only when the archive actually changes.
- Live fetch fails and manifest is missing/empty: preserve existing records and mark status `failed`.

Partial fallback must not replace existing row-level CSV records with lower-detail
bundle or manifest records. If an existing release date is already represented,
the sync preserves the richer existing records and skips fallback rows for that
release date. Maintainers can test this path locally with
`WAR_UFO_FORCE_FALLBACK=1 npm run sync:war`.

Release 02 currently uses this fallback path because `war.gov/ufo` and the
document bundle return `403` to server-side fetches, while the official linked
CloudFront video bundle allows byte-range access. The sync reads the ZIP central
directory instead of downloading the full 5.6 GB archive.

To add a future bundle fallback manually, add an entry to
`data/official-bundles.json` after confirming the URL is publicly linked from
`war.gov/ufo` or an official `war.gov` release page. Add any newly relevant
official release or search page to `data/official-release-pages.json` so the
discovery pass can keep checking it. Use `mode: "zip-entries"` only for ZIP URLs
that allow range reads; otherwise use `mode: "aggregate"` so the archive tracks
the official bundle as a single source record.

No-op runs should not create timestamp-only commits. If sync discovers no new or
changed cases and no release-count changes, preserve the previous metadata file
so scheduled GitHub Actions stay quiet, including transient partial fallback
runs that only confirm already-represented releases.

## Freshness Policy

- `fresh`: last successful sync is within the expected cadence.
- `seeded`: starter data is present before a successful live sync.
- `stale`: last successful sync is older than the expected cadence.
- `partial`: sync succeeded but some official pages or files failed.
- `failed`: sync attempt failed and previous data remains in place.
- `paused`: maintainers intentionally disabled updates.

The MVP should use a 7-day freshness window unless maintainers choose a different cadence.

## Banner Rules

- Fresh data: no blocking banner.
- Seeded data: show info banner that the archive is using starter records.
- Stale data: show warning with `lastSuccessAt`.
- Partial data: show warning that some records may be missing.
- Failed sync: show error with `lastAttemptAt` and `lastSuccessAt`.
- Paused sync: show neutral info message.

Banner text should be factual and brief. It must not imply new official records exist unless the sync verified that.

## Failure Handling

If sync fails:

1. Keep the last known good `data/cases.json`.
2. Run the official bundle discovery pass and preserve the existing registry if official pages are blocked.
3. Try `data/war-ufo-manifest.json` and `data/official-bundles.json` as official URL fallbacks.
4. Update `data/sync-metadata.json` to `partial` if fallback records were normalized, otherwise `failed`.
5. Run `npm run build` to confirm the app still deploys.

## Manual QA After Sync

- Confirm case count changed only when expected.
- Confirm release counts changed only when expected.
- Spot-check official URLs.
- Confirm retrieval timestamps are current.
- Confirm banner state matches sync result.
- Open `/explore`, `/timeline`, `/map`, and at least one `/case/[id]`.
