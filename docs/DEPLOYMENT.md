# Deployment

## Target

Deploy the MVP to Vercel as a static-first Next.js app backed by repo-local JSON.

## Expected Build Commands

```bash
npm install
npm run build
```

Recommended pre-deploy checks:

```bash
npm run sync:war
npm run build
npm run lint
npm test
```

## Vercel Settings

- Framework preset: Next.js.
- Build command: `npm run build`.
- Install command: `npm install`.
- Output: Next.js default, or static export if the implementation chooses `output: "export"`.
- Environment variables: none required for MVP if the source is public and sync is run locally or in CI.

## Deployment Model

Two acceptable MVP models:

- Manual sync: maintainer runs `npm run sync:war`, commits JSON changes, and Vercel deploys from the repo.
- Scheduled sync: CI runs `npm run sync:war`, opens or commits JSON updates, then Vercel deploys.

The first MVP can use manual sync to keep operations simple.

## Crawler And Agent Surfaces

The canonical public host is `https://ufofiles.info`. Keep `app/robots.ts`,
`app/sitemap.ts`, metadata, and structured data aligned to that host.

The site exposes static, machine-readable surfaces for search engines, LLMs, and
other agents:

- `/sitemap.xml`: canonical page discovery, including generated case pages.
- `/robots.txt`: permits crawling and points at the canonical sitemap.
- `/llms.txt`: concise retrieval guide, source policy, data URLs, and case links.
- `/data/archive.json`: combined archive data.
- `/data/cases.json`: normalized case records.
- `/data/releases.json`: normalized release records.
- `/data/sync-metadata.json`: latest sync status and retrieval metadata.

Case pages should keep per-record metadata, canonical URLs, JSON-LD, visible
source links, and official provenance details in sync with `data/cases.json`.

## Release Checklist

- `data/cases.json` exists and validates.
- `data/releases.json` exists and validates.
- `data/sync-metadata.json` exists and banner state is accurate.
- `npm run build` succeeds.
- `npm run lint` succeeds.
- Tests pass, or documented test gaps are accepted.
- `/explore`, `/timeline`, `/map`, `/about`, and a case detail page render.
- `/robots.txt`, `/sitemap.xml`, `/llms.txt`, and `/data/archive.json` return
  public content with the canonical host.
- Official source links open to `war.gov/ufo` or approved official files.

## Rollback

If a deployment has bad data:

1. Revert only the bad data or docs change through normal version control.
2. Keep the last good deployment available in Vercel.
3. Set sync status to `failed` or `paused` if source freshness is uncertain.
4. Redeploy after `npm run build` passes.
