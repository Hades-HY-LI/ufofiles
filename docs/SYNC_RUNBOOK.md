# Sync Runbook

## Purpose

Sync keeps the static JSON archive aligned with the official public source at `war.gov/ufo`.

## Command

Project sync command:

```bash
npm run sync:war
```

Recommended release flow:

```bash
npm run sync:war
npm run build
npm run lint
npm test
```

## Source Policy

- Fetch only public pages and public files from `https://www.war.gov/ufo/` and official linked files under the same source policy.
- Do not ingest mirrors, social posts, community spreadsheets, or news articles as case facts.
- Preserve official URLs and retrieval timestamps.
- Respect robots, rate limits, and transient failures.
- Do not bypass access controls or download non-public material.

## Sync Outputs

- `data/cases.json`: normalized cases.
- `data/releases.json`: official PURSUE release records.
- `data/sync-metadata.json`: latest sync health and banner inputs.
- `data/war-ufo-manifest.json`: operator-maintained official URL fallback used when `war.gov/ufo` blocks command-line/server fetches.

## Manifest Fallback

The official site is publicly browsable, but its Akamai edge may return `403` to command-line or server-side fetches. When that happens, `npm run sync:war` falls back to `data/war-ufo-manifest.json`.

The manifest must represent the Release file table, not the evidence-photo carousel. Release 01 currently normalizes 161 top-level file rows: PDFs, top-level images, and videos. Extracted images from inside PDFs should not become case records.

The manifest must contain only official `war.gov` URLs, official DVIDS video URLs linked by the release materials, or official URLs linked from `war.gov/ufo`. It is acceptable for a maintainer to update this file after visually confirming new public links in a normal browser. The sync script then normalizes those links into `data/cases.json`.

Fallback sync behavior:

- Live fetch succeeds: normalize discovered page records and mark status `fresh`.
- Live fetch fails but manifest has records: normalize manifest records and mark status `partial`.
- Live fetch fails and manifest is missing/empty: preserve existing records and mark status `failed`.

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
2. Try `data/war-ufo-manifest.json` as the official URL fallback.
3. Update `data/sync-metadata.json` to `partial` if fallback records were normalized, otherwise `failed`.
4. Run `npm run build` to confirm the app still deploys.

## Manual QA After Sync

- Confirm case count changed only when expected.
- Spot-check official URLs.
- Confirm retrieval timestamps are current.
- Confirm banner state matches sync result.
- Open `/explore`, `/timeline`, `/map`, and at least one `/case/[id]`.
