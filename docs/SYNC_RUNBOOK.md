# Sync Runbook

## Purpose

Sync keeps the static JSON archive aligned with the official public source at `war.gov/ufo`.

## Command

Project sync command:

```bash
npm run discover:war-bundles
npm run sync:war
npm run validate:data
```

Recommended release flow:

```bash
npm run discover:war-bundles
npm run sync:war
npm run validate:data
npm run build
npm run lint
npm test
```

## Scheduled Automation

`.github/workflows/sync-war-ufo.yml` runs daily at 09:17 UTC and retains
manual dispatch from the GitHub Actions tab. The job runner is selected by the
repository variable `WAR_UFO_RUNNER`:

- Unset or empty: use the GitHub-hosted `ubuntu-latest` runner.
- `ufo-sync`: use a self-hosted runner carrying the custom `ufo-sync` label.

Set the variable under **Repository settings → Secrets and variables → Actions
→ Variables**. It is a non-secret selector; do not put credentials in it. A
self-hosted runner is the recovery option when War.gov returns `403` to the
GitHub-hosted runner. It must use ordinary, permitted network egress to the
official source. Do not route sync traffic through third-party mirrors,
scraping proxies, or access-control bypass services.

The workflow validates and builds the complete change, then reads
`data/sync-metadata.json` before its pull-request step. It opens or updates
`automated/war-ufo-sync` only when `status` is `fresh`. A `partial` or `failed`
attempt writes a concise diagnostic to the job log and step summary, fails the
workflow, and does not publish a data branch or PR. A fresh PR does not publish
the data by itself: a maintainer must review and merge it. A no-change fresh run
stays green without opening a PR.

Only the exact runner values `ubuntu-latest` and `ufo-sync` are supported. An
unset variable maps to `ubuntu-latest`; an unsupported nonempty value maps to
the hosted runner only long enough for the first step to reject it. The
`ufo-sync` choice maps to both required labels, `[self-hosted, ufo-sync]`, rather
than evaluating the variable as an arbitrary runner label or expression.

The workflow serializes runs that could update the fixed
`automated/war-ufo-sync` branch. It uses immutable reviewed action SHAs,
disables persisted checkout credentials, supplies the scoped GitHub token only
to the pull-request action, and runs the sync parser regression suite through
`npm test` before the freshness gate.

Configure repository notifications or an external monitor to alert on failures
of **Sync WAR UFO releases**. Treat a red run and its **WAR UFO sync blocked**
summary as a source-reachability/data-freshness incident, even when the existing
archive continues to build. Diagnose degraded metadata in that run's workspace
logs; there will be no automation PR to review or merge.

## Self-hosted Runner Recovery

Provision a dedicated, patched, ephemeral Linux VM with outbound HTTPS access
and a non-root service account. Put it in an isolated runner group allowed only
for this repository, and give it the unique custom label `ufo-sync`. Prefer a
just-in-time runner that is destroyed after one job; otherwise reimage it from
a trusted base image after every job before accepting more work. Permit only
the operational endpoints needed for GitHub Actions and npm dependency
installation plus the official public source hosts referenced by the
registries, including `war.gov` and official linked file hosts. Do not allow
third-party data mirrors or proxies. The runner does not require repository
secrets for this sync.

Using the current runner package and short-lived registration token shown by
GitHub under **Repository settings → Actions → Runners → New self-hosted
runner**, configure and start the service conceptually as follows:

```bash
mkdir actions-runner
cd actions-runner
# Download and verify the current runner package using GitHub's displayed commands.
# Export the short-lived token without writing it to shell history or a file.
./config.sh --url https://github.com/OWNER/REPOSITORY \
  --token "$RUNNER_REGISTRATION_TOKEN" \
  --name ufo-sync-01 \
  --runnergroup UFO_SYNC_ISOLATED_GROUP \
  --labels ufo-sync \
  --ephemeral \
  --unattended
sudo ./svc.sh install RUNNER_SERVICE_ACCOUNT
sudo ./svc.sh start
sudo ./svc.sh status
```

Replace placeholders locally. Never commit or print the registration token.
The runner-group option applies to organization runners; for a repository-level
runner, omit that option and ensure the runner is registered only to this
repository. An ephemeral runner accepts one job and must be reprovisioned and
reregistered afterward.
Confirm that the runner is online and idle in repository settings, then set
`WAR_UFO_RUNNER=ufo-sync` and manually dispatch the workflow. The workflow
installs Node 22 and dependencies itself. Keep the OS and runner current,
isolate the account from production credentials, and never reuse a job
workspace or host image without reimaging it.

Protect the default branch with a repository ruleset requiring review and a CI
health check that evaluates the PR revision's `data/sync-metadata.json` as
`fresh`. The scheduled workflow will not create degraded automation PRs; keep
auto-merge disabled for any manually created degraded data PR. Maintainers
should not assume the scheduled run is attached to a generated PR's head
commit, so branch protection must require the equivalent PR health check before
merge.

To return scheduling to GitHub-hosted capacity, remove `WAR_UFO_RUNNER` (or set
it to `ubuntu-latest`). This is an execution rollback only; it will not resolve
a War.gov `403`, and the health gate should remain enabled.

## Release 03/04 Recovery

Run recovery on a network path that can reach the official War.gov sources,
preferably by manually dispatching the `ufo-sync` runner:

```bash
gh workflow run sync-war-ufo.yml
gh run list --workflow sync-war-ufo.yml --limit 1
```

For an operator-side recovery and review, use:

```bash
git switch -c recovery/war-ufo-release-03-04
npm ci
npm run discover:war-bundles
npm run sync:war
npm run validate:data
node -e "const m=require('./data/sync-metadata.json'); if(m.status!=='fresh') process.exit(1)"
npm run lint
npm run typecheck
npm run build
npm test
git diff -- data/
```

Verify that Release 03 and Release 04 counts, official URLs, and retrieval
metadata match the public War.gov release before committing the `data/` changes
and opening a PR. Do not hand-edit the status to `fresh`. If the health check
still fails, preserve the emitted `partial` or `failed` metadata, inspect the
workflow logs, and leave the archive on the last known-good data while the
source incident is investigated.

## Source Policy

- Fetch only public pages and public files from `https://www.war.gov/ufo/` and official linked files under the same source policy.
- Prefer the official War.gov CSV export at `https://www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv` when reachable.
- Do not ingest mirrors, social posts, community spreadsheets, or news articles as case facts.
- Preserve official URLs and retrieval timestamps.
- Respect robots, rate limits, and transient failures.
- Do not bypass access controls or download non-public material.

## Sync Outputs

- `data/cases.json`: normalized cases.
- `data/releases.json`: official PURSUE release records.
- `data/sync-metadata.json`: latest sync health and banner inputs.
- War.gov CSV export: primary official source for row-level records, including documents, images, videos, and audio.
- `data/war-ufo-manifest.json`: operator-maintained official URL fallback used when `war.gov/ufo` blocks command-line/server fetches.
- `data/official-release-pages.json`: official portal, release search, and release article pages scanned before sync.
- `data/official-bundles.json`: official linked release bundles. Automation can read ZIP central-directory metadata by HTTP range request when the bundle host allows it.

Run `npm run validate:data` after discovery and sync. It verifies JSON schemas,
unique IDs, release counts, approved official hosts, sync metadata references,
and that the derived relationship graph has valid nodes, edges, and reasons.

## Discovery Pass

`npm run discover:war-bundles` runs before `npm run sync:war` in GitHub
Actions. It scans only configured official War.gov pages and release pages found
from official War.gov UAP search results. When it finds approved ZIP bundle
links, it updates `data/official-bundles.json`; it does not ingest mirrors,
social posts, community catalogs, or search-engine-only results.

If official pages return `403`, the discovery pass leaves the existing registry
in place and prints a warning. This keeps scheduled runs useful without treating
a blocked War.gov edge response as evidence that no new official files exist.

## Manifest Fallback

The official site is publicly browsable, but its Akamai edge may return `403` to command-line or server-side fetches. When that happens, `npm run sync:war` falls back to `data/war-ufo-manifest.json`.

The sync order is:

1. Official War.gov CSV export.
2. Live `war.gov/ufo` page discovery.
3. `data/war-ufo-manifest.json`.
4. `data/official-bundles.json`.

The manifest must represent the Release file table, not the evidence-photo carousel. Release 01 currently normalizes 161 top-level file rows: PDFs, top-level images, and videos. Extracted images from inside PDFs should not become case records.

The manifest must contain only official `war.gov` URLs, official DVIDS video URLs linked by the release materials, or official URLs linked from `war.gov/ufo`. It is acceptable for a maintainer to update this file after visually confirming new public links in a normal browser. The sync script then normalizes those links into `data/cases.json`.

Fallback sync behavior:

- CSV or live fetch succeeds: normalize discovered official records and mark status `fresh`.
- Live fetch fails but manifest or official linked bundles have records: normalize fallback records only for release dates not already represented in `data/cases.json`, then mark status `partial` only when the archive actually changes.
- Live fetch fails and manifest is missing/empty: preserve existing records and mark status `failed`.

Partial fallback must not replace existing row-level CSV records with lower-detail
bundle or manifest records. If an existing release date is already represented,
the sync preserves the richer existing records and skips fallback rows for that
release date. Maintainers can test this path locally with
`WAR_UFO_FORCE_FALLBACK=1 npm run sync:war`.

Release 02 currently uses this fallback path because `war.gov/ufo` and the
document bundle return `403` to server-side fetches, while the official linked
CloudFront video bundle allows byte-range access. The sync reads the ZIP central
directory instead of downloading the full 5.6 GB archive.

To add a future bundle fallback manually, add an entry to
`data/official-bundles.json` after confirming the URL is publicly linked from
`war.gov/ufo` or an official `war.gov` release page. Add any newly relevant
official release or search page to `data/official-release-pages.json` so the
discovery pass can keep checking it. Use `mode: "zip-entries"` only for ZIP URLs
that allow range reads; otherwise use `mode: "aggregate"` so the archive tracks
the official bundle as a single source record.

Fresh no-op runs should not create timestamp-only commits. If a successful live
sync discovers no new or changed cases and no release-count changes, preserve
the previous metadata file so scheduled GitHub Actions stay quiet. A degraded
run is not a fresh no-op: automation must write `partial` or `failed` attempt
metadata even when existing records are preserved, so the final workflow health
gate cannot report a false success.

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
2. Run the official bundle discovery pass and preserve the existing registry if official pages are blocked.
3. Try `data/war-ufo-manifest.json` and `data/official-bundles.json` as official URL fallbacks.
4. Update `data/sync-metadata.json` to `partial` if fallback records were normalized, otherwise `failed`.
5. Run `npm run build` to confirm the app still deploys.

## Manual QA After Sync

- Confirm case count changed only when expected.
- Confirm release counts changed only when expected.
- Spot-check official URLs.
- Confirm retrieval timestamps are current.
- Confirm banner state matches sync result.
- Open `/explore`, `/timeline`, `/map`, and at least one `/case/[id]`.
