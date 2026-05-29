# Data Model

## Files

### `data/cases.json`

Top-level array of normalized case records.

```json
[
  {
    "id": "official-slug-or-stable-hash",
    "title": "Official case title",
    "agency": "Department of War",
    "releaseDate": "YYYY-MM-DD",
    "incidentDate": null,
    "locationName": "City, State, Country",
    "latitude": null,
    "longitude": null,
    "type": "document",
    "sourceUrl": "https://www.war.gov/ufo/",
    "mediaUrl": null,
    "summary": "Short neutral summary.",
    "tags": ["official", "document"],
    "confidence": "official-source"
  }
]
```

## Required Case Fields

- `id`: stable lowercase identifier. Do not change once published.
- `title`: official or minimally normalized title.
- `agency`: publishing agency, currently `Department of War` for seeded records.
- `releaseDate`: ISO date the official release was published or indexed.
- `incidentDate`: ISO date of the incident when known, otherwise `null`.
- `locationName`: human-readable location or official portal label.
- `latitude` and `longitude`: coordinates when known, otherwise `null`.
- `type`: controlled display group: `document`, `video`, `image`, `audio`, or `unknown`.
- `sourceUrl`: canonical `https://www.war.gov/ufo/` URL or official linked source URL.
- `mediaUrl`: official file or media URL when available, otherwise `null`.
- `summary`: neutral description derived from official material.
- `tags`: lowercase filter terms.
- `confidence`: provenance label; MVP records should use `official-source`.

Bundle-derived records use the official bundle URL as `sourceUrl`. Individual
large video entries may have `mediaUrl: null` because the archive records the ZIP
entry name without downloading and republishing the media file.

When the official CSV export is reachable, row-level records are normalized from
`https://www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv`. The CSV is
the preferred source for release counts because it includes row-level video and
audio metadata that is not visible from a plain HTML fetch in server
environments.

## `data/releases.json`

Top-level array of official PURSUE release records.

```json
[
  {
    "id": "pursue-release-01",
    "title": "PURSUE Release 01",
    "releaseDate": "2026-05-08",
    "sourceUrl": "https://www.war.gov/ufo/",
    "fileCount": 0,
    "notes": "Seed release record. Automated sync updates this when official files are detected."
  }
]
```

## `data/sync-metadata.json`

```json
{
  "lastSyncedAt": "2026-05-08T00:00:00.000Z",
  "sourceUrl": "https://www.war.gov/ufo/",
  "totalRecords": 2,
  "newRecordCount": 0,
  "changedRecordCount": 0,
  "latestNewCaseIds": [],
  "latestChangedCaseIds": [],
  "status": "seeded"
}
```

Allowed `status` values for the MVP:

- `seeded`: starter data is present before a successful live sync.
- `fresh`: latest sync succeeded within the freshness window.
- `stale`: last successful sync is older than the freshness window.
- `partial`: sync succeeded but some official records or files could not be read.
- `failed`: latest sync failed and the app is using previous data.
- `paused`: maintainers intentionally disabled sync.

Banner severity should be derived from this status: no banner for `fresh`, info for `seeded` or `paused`, warning for `stale` or `partial`, and error for `failed`.

## Normalization Rules

- Preserve official wording where possible.
- Use `null` for unknown values; do not invent data.
- Coordinates may be inferred from official location text, but must be treated as approximate.
- Put inference details in release notes, code comments, or a future normalization notes field before exposing them as facts.
- Keep unofficial references out of case facts.

## `data/war-ufo-manifest.json`

Operator-maintained fallback for official file-table rows when the public site blocks automated server fetches. This is for the release file list, not the evidence-photo carousel.

```json
{
  "sourceUrl": "https://www.war.gov/ufo/",
  "generatedAt": "2026-05-09T00:00:00.000Z",
  "notes": "Official Release 01 file-table URLs visible on war.gov/ufo.",
  "expectedFileCount": 161,
  "counts": {
    "documents": 119,
    "images": 14,
    "videos": 28,
    "records": 161
  },
  "records": [
    {
      "title": "[PR-011] Evidence photo 1",
      "mediaUrl": "https://www.war.gov/portals/1/Interactive/2026/UFO/Slideshow/FBI-Photo-1.jpg",
      "releaseDate": "2026-05-08",
      "incidentDate": "2025-12-01",
      "locationName": "Western United States",
      "agency": "AARO",
      "type": "image",
      "summary": "Neutral official-source summary.",
      "tags": ["official", "release-01"]
    }
  ]
}
```

Manifest records are normalized into `data/cases.json` by `npm run sync:war`; the app does not read this file directly.

## `data/official-bundles.json`

Official release bundle registry used by the sync fallback path. This file is
for public bundle URLs confirmed from official `war.gov` release pages. It lets
maintainers add future release ZIPs without changing the sync script. It can be
updated manually or by `npm run discover:war-bundles`.

```json
{
  "bundles": [
    {
      "id": "release-02-video-bundle",
      "title": "PURSUE Release 02 video bundle",
      "url": "https://d34w7g4gy10iej.cloudfront.net/uap052226.zip",
      "releaseDate": "2026-05-22",
      "releaseTag": "release-02",
      "type": "video",
      "mode": "zip-entries",
      "agency": "Department of War",
      "summary": "Official PURSUE Release 02 video bundle linked from the public government UAP release portal.",
      "sourcePageUrl": "https://www.war.gov/ufo/"
    }
  ]
}
```

Allowed `mode` values:

- `aggregate`: create one case record for the official bundle URL.
- `zip-entries`: read the ZIP central directory by HTTP range request and create
  one record per top-level file entry.

## `data/official-release-pages.json`

Official pages scanned by `npm run discover:war-bundles` before sync. The
discovery script accepts only War.gov pages as scan inputs and only approved
official bundle hosts as outputs.

```json
{
  "pages": [
    {
      "url": "https://www.war.gov/ufo/",
      "kind": "portal"
    },
    {
      "url": "https://www.war.gov/News/Releases/Search/uap/",
      "kind": "release-search"
    }
  ]
}
```

Allowed `kind` values:

- `portal`: the public PURSUE file portal.
- `release-search`: an official War.gov search/list page that can reveal future release articles.
- `release`: a specific official War.gov release article.

## Derived Relationship Graph

The relationship graph is computed at build time from `data/cases.json`; it is
not a separate source-of-record file. `lib/relationships.ts` scores file pairs
using shared release date, agency, media type, tags, and recurring title/summary
terms. The graph route displays the highest-scoring nodes and edges so users can
inspect significant clusters without changing the underlying case schema.
