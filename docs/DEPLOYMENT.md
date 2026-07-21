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
- Scheduled sync: CI runs `npm run sync:war`, opens a reviewable JSON update PR, and Vercel deploys after merge.

The first MVP can use manual sync to keep operations simple.

The configured GitHub Actions workflow runs daily at 09:17 UTC and can also be
started manually from the Actions tab. It does not commit directly to `main`;
it opens a pull request for generated data changes so maintainers can inspect
sync deltas before merging. Set the repository Actions variable
`WAR_UFO_RUNNER` to `ufo-sync` to route the job to a dedicated self-hosted
runner with that label and permitted official-source network egress. When the
variable is absent, the workflow uses `ubuntu-latest`. See
`docs/SYNC_RUNBOOK.md` for setup and recovery details.

The workflow validates data and provenance changes, runs parser regression
tests, and checks sync health before the pull-request step. A `partial` or
`failed` sync writes a sanitized job diagnostic, makes the workflow red, and
does not publish an automation branch or PR. Fresh generated PRs require
maintainer review and merge before Vercel deploys them. Protect the deployment
branch with required review and a PR health check that verifies
`data/sync-metadata.json` is `fresh`; do not auto-merge manually created
degraded data PRs.

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

If the self-hosted runner is unhealthy, remove `WAR_UFO_RUNNER` or set it to
`ubuntu-latest` to restore the default runner selection. Do not disable the
freshness gate to make a blocked sync green. Switching runners does not change
or deploy archive data; any data rollback should be a reviewed revert followed
by the normal Vercel deployment path.

## Operational Configuration And Risk

- Required application environment variables: none.
- Optional repository Actions variable: `WAR_UFO_RUNNER`; use `ufo-sync` for
  the dedicated self-hosted runner, otherwise leave it unset.
- Required sync secrets: none. Self-hosted registration uses GitHub's
  short-lived token during setup only; never store it in the repository or
  application environment.
- Downtime/data-loss risk: changing runner selection does not alter the serving
  deployment, and sync output remains gated by PR review. Preserve the last
  known-good Vercel deployment for rollback.
- Cost risk: `ubuntu-latest` consumes GitHub-hosted Actions minutes; `ufo-sync`
  adds the host/VM, patching, monitoring, and egress costs borne by the
  operator.
- Security risk: self-hosted jobs execute repository workflow code with write
  access needed to create the data PR. Restrict the runner to this repository,
  place it in an isolated runner group, use a dedicated least-privilege account,
  keep production secrets off the host, and do not expose it to untrusted
  pull-request workflows. Prefer an ephemeral just-in-time runner destroyed
  after each job, or reimage the host from a trusted base image after every job.
