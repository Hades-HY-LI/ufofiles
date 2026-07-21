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
npm run validate:data
npm run build
npm run lint
npm run typecheck
npm test
```

## Vercel Settings

- Framework preset: Next.js.
- Build command: `npm run build`.
- Install command: `npm install`.
- Output: Next.js default, or static export if the implementation chooses `output: "export"`.
- Environment variables: none required for MVP if the source is public and sync is run locally or in CI.

## Deployment Model

The current operating model is a manual, maintainer-reviewed data sync every two
weeks and whenever War.gov publishes a release. The maintainer runs discovery,
sync, validation, tests, and the production build locally; reviews the generated
JSON; and opens a data pull request. Vercel deploys only after that PR is merged.

Follow `docs/MANUAL_SYNC.md` for the complete procedure. Do not publish a sync
whose metadata is `partial` or `failed`. The GitHub Actions sync workflow has no
schedule and remains available through `workflow_dispatch` only as an optional
diagnostic or recovery tool.

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

The manual sync process is separate from the serving deployment. A failed sync
must leave the last known-good data deployed. Do not disable the freshness gate
or hand-edit metadata to make a blocked sync appear healthy; any data rollback
should be a reviewed revert followed by the normal Vercel deployment path.

## Operational Configuration And Risk

- Required application environment variables: none.
- Required sync secrets: none for the local manual process.
- Required runner infrastructure: none.
- Downtime/data-loss risk: sync output remains gated by local verification and
  PR review. Preserve the last known-good Vercel deployment for rollback.
- Operational risk: a missed reminder may leave the archive stale. Check the
  official source in addition to the biweekly reminder when a release is
  announced.
