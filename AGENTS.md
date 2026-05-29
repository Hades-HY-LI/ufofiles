# UFO Files Archive Agents Guide

## Scope

This repo builds a static-first Next.js MVP for browsing official UFO/UAP records sourced from `war.gov/ufo`. The first release should be useful as an archive: fast browsing, clear provenance, stable static JSON data, and visible sync status.

## Ownership Rules

- Keep product, design, data, sync, deployment, and testing decisions documented in `README.md` and `docs/`.
- Keep speculative product ideas in `docs/IDEAS.md`; do not mix them into source-of-record case data.
- Do not change source policy casually. The archive is official-source only unless a maintainer explicitly approves a new source class.
- Do not store secrets, private notes, or unpublished records in the repo.
- Generated or normalized public data belongs under `data/` when implementation ownership allows it.
- UI implementation should follow `docs/DESIGN_SYSTEM.md` and `docs/DESIGN.md`: minimalist, source-forward, interactive, dark archival, vibrant only where it improves scanning or orientation.

## Expected Commands

These are the intended commands once the Next.js MVP package files are present:

```bash
npm install
npm run dev
npm run discover:war-bundles
npm run sync:war
npm run build
npm run lint
npm run validate:data
npm test
```

The MVP should support static export or static Vercel deployment with JSON read at build time from repo-local files.

## Source Policy

`war.gov/ufo` is the canonical source. Every case record must preserve the official URL, and sync-level retrieval metadata in `data/sync-metadata.json` must let a reader trace the archive back to the public government page or file.

Mirrors, news articles, social posts, and community catalogs may be useful for discovery, but they are not source-of-record data for the MVP.

When `war.gov/ufo` blocks automated server fetches, official linked bundles may be used as fallback source material only if they can be traced back to the public government release page. Do not download large media archives just to list contents; prefer ZIP central-directory range reads when possible.

Discovery pages for official release and bundle scanning belong in `data/official-release-pages.json`.
Future official bundle fallbacks belong in `data/official-bundles.json`, not hardcoded in the sync script.
