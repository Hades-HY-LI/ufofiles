# UFO Files Archive Agents Guide

## Scope

This repo builds a static-first Next.js MVP for browsing official UFO/UAP records sourced from `war.gov/ufo`. The first release should be useful as an archive: fast browsing, clear provenance, stable static JSON data, and visible sync status.

## Ownership Rules

- Keep product, design, data, sync, deployment, and testing decisions documented in `README.md` and `docs/`.
- Do not change source policy casually. The archive is official-source only unless a maintainer explicitly approves a new source class.
- Do not store secrets, private notes, or unpublished records in the repo.
- Generated or normalized public data belongs under `data/` when implementation ownership allows it.
- UI implementation should follow `docs/DESIGN_SYSTEM.md`: dark archival, restrained, dense, legible, and source-forward.

## Expected Commands

These are the intended commands once the Next.js MVP package files are present:

```bash
npm install
npm run dev
npm run sync:war
npm run build
npm run lint
npm test
```

The MVP should support static export or static Vercel deployment with JSON read at build time from repo-local files.

## Source Policy

`war.gov/ufo` is the canonical source. Every case record must preserve the official URL, and sync-level retrieval metadata in `data/sync-metadata.json` must let a reader trace the archive back to the public government page or file.

Mirrors, news articles, social posts, and community catalogs may be useful for discovery, but they are not source-of-record data for the MVP.
