# Contributing

Thanks for helping improve UFO Files Archive. This project is a static-first, non-commercial archive for official UFO/UAP release records.

## Ground Rules

- Use official-source records only for case data.
- Do not invent dates, locations, summaries, coordinates, or provenance.
- Keep every record traceable to an official source URL.
- Keep the app independent and unaffiliated with the U.S. government.
- Preserve incomplete official records with `null` or clear unknown states.

## Local Setup

```bash
npm install
npm run dev
```

Before opening a pull request:

```bash
npm run sync:war
npm run lint
npm run typecheck
npm run build
```

## Data Changes

Most data changes should start in `data/war-ufo-manifest.json` or the sync script. The generated outputs are:

- `data/cases.json`
- `data/releases.json`
- `data/sync-metadata.json`

If `war.gov/ufo` blocks automated fetches, the manifest fallback may be used, but it must represent official release table rows and official linked files only.

## UI Changes

Follow `docs/DESIGN_SYSTEM.md`: dark archival, serious, legible, dense, and source-forward. Avoid sensational, conspiracy-board, or cartoon visual language.

## Pull Requests

Please include:

- What changed.
- Why it changed.
- Screenshots for UI changes.
- Verification commands run.
- Any source/data assumptions.
