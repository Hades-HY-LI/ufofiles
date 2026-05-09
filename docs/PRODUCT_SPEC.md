# Product Spec

## Product

UFO Files Archive is a public, static-first web archive for official UFO/UAP material published at `war.gov/ufo`.

The product should feel like a research desk: source-first, quiet, fast, and trustworthy. It should not present theories, editorial claims, or unsupported enrichment as facts.

## Audience

- Researchers who need a browsable index of official files.
- Journalists who need source URLs and retrieval context.
- Curious readers who want a sober archive instead of speculation.
- Maintainers who need a simple sync and deployment workflow.

## MVP User Stories

- As a reader, I can browse all normalized cases in a dense list.
- As a reader, I can open a case and see its source URL, date, location, summary, tags, documents, and sync metadata.
- As a researcher, I can filter by year, category, location, and tag.
- As a reader, I can scan a timeline of cases.
- As a reader, I can view mapped cases when coordinates exist.
- As a maintainer, I can run a sync that updates static JSON and records whether the source was reachable.
- As a maintainer, I can deploy to Vercel without a database.

## Pages

- `/`: archive overview, freshness banner, primary navigation, recent or featured official records.
- `/explore`: searchable and filterable case list.
- `/case/[id]`: case detail with source provenance.
- `/timeline`: chronological archive view.
- `/map`: map of cases with coordinates.
- `/about`: source policy, limitations, and update cadence.

## Core Requirements

- Static JSON is the data source for the MVP.
- Official source links must be visible on every case detail page.
- The app must distinguish official fields from inferred normalized fields.
- The sync banner must be visible when data is stale, partial, failed, or manually paused.
- The site must work on desktop and mobile without hiding provenance.

## Non-Goals

- No user accounts.
- No database.
- No comments, voting, or submissions.
- No speculative scoring.
- No AI-generated case facts.
- No unofficial source ingestion for MVP records.

## Success Criteria

- `npm run build` succeeds for a static deployment.
- A reader can move from archive list to official source in one click from a case page.
- Sync status is understandable without opening developer tools.
- The visual design reads as dark archival, not sci-fi entertainment.

