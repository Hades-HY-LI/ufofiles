# UFO Files Archive

A static-first archive for official UFO/UAP records published at `war.gov/ufo`.

The MVP is a Next.js app backed by repo-local JSON. It emphasizes provenance, browsability, and a sober dark archival interface over commentary or speculation.

This is an independent fan archive and is not affiliated with the U.S. government.

## MVP Goals

- Browse official cases with title, date, location, category, summary, tags, and source links.
- Explore records by list, map, timeline, and case detail pages.
- Show sync freshness through a visible banner when data is stale, incomplete, or the official source cannot be reached.
- Deploy cleanly to Vercel as a static JSON-backed app.

## Source Policy

The archive is official-source only for case data. The canonical source is:

```text
https://war.gov/ufo
```

Each normalized record should retain:

- Official source URL.
- Original document or media URL when available.
- Normalization notes for any inferred fields.

`data/sync-metadata.json` records the archive retrieval timestamp and sync result.

Non-official material can be used only as implementation notes or external references, not as case facts.

## License And Attribution

Code is released under the MIT License. See `LICENSE`.

Official government source data, document links, media links, and release metadata remain attributed to their official sources, primarily `https://www.war.gov/ufo/`. This project organizes and links to public official-source materials; it does not claim ownership of those government records.

## Expected Project Commands

When the Next.js package is present, the project should expose:

```bash
npm install
npm run dev
npm run sync:war
npm run build
npm run lint
npm test
```

Recommended local flow:

```bash
npm run sync:war
npm run build
npm run dev
```

## Static Data Contract

The app should read static JSON from `data/` at build time. The minimum expected files are:

- `data/cases.json`: normalized case list.
- `data/releases.json`: official PURSUE release records.
- `data/sync-metadata.json`: last sync result and banner inputs.
- `data/war-ufo-manifest.json`: official URL fallback for cases where `war.gov/ufo` blocks server-side fetches.

See `docs/DATA_MODEL.md` for the field contract.

## Documentation

- `docs/PRODUCT_SPEC.md`: MVP product behavior.
- `docs/DESIGN_DOC.md`: app architecture and routes.
- `docs/DATA_MODEL.md`: JSON data schema.
- `docs/SYNC_RUNBOOK.md`: official-source sync behavior.
- `docs/DESIGN_SYSTEM.md`: approved dark archival UI direction.
- `docs/DEPLOYMENT.md`: Vercel deployment notes.
- `docs/TEST_PLAN.md`: verification plan.
- `docs/TOOLS_AND_SKILLS.md`: project tools and maintainer workflow.
