# Manual WAR UFO Sync

## Operating model

The archive is updated manually from a maintainer workstation. Run this process
every two weeks and whenever War.gov announces a new UFO/UAP release.

The sync implementation discovers releases dynamically, so an ordinary new
batch does not require a code change. Code or registry changes are needed only
if War.gov changes its data format, moves to a new official host, or publishes a
source that the existing discovery rules cannot recognize.

Do not hand-edit generated case or release records. Do not publish a sync unless
`data/sync-metadata.json` reports `fresh` and every verification command passes.

## Prerequisites

- Use a network connection that can reach `https://www.war.gov/ufo/` and its
  official CSV export.
- Install Node.js 22 and npm.
- Start from a clean checkout of `main`.
- Ensure the current sync implementation has already been merged into `main`.

## Step-by-step process

### 1. Update local `main`

```bash
cd /Users/hadesli/Desktop/Developer/ufofiles
git switch main
git pull --ff-only origin main
git status
```

Stop if `git status` shows unrelated local changes. Preserve or commit those
changes before starting the sync.

### 2. Create a dated branch

Replace `YYYY-MM-DD` with today's date:

```bash
git switch -c manual/war-ufo-sync-YYYY-MM-DD
```

Example:

```bash
git switch -c manual/war-ufo-sync-2026-08-04
```

### 3. Install the locked dependencies

```bash
npm ci
```

### 4. Discover official bundles and sync records

```bash
npm run discover:war-bundles
npm run sync:war
```

The commands fetch only approved official sources, normalize the records, keep
stable IDs where possible, and write repo-local JSON under `data/`.

### 5. Require a fresh result

```bash
node -e "const m=require('./data/sync-metadata.json'); console.log({status:m.status,lastAttemptAt:m.lastAttemptAt,lastSuccessAt:m.lastSuccessAt}); if(m.status!=='fresh') process.exit(1)"
```

Continue only when this command exits successfully and prints `status: 'fresh'`.
If the status is `partial` or `failed`, do not stage, commit, or publish the
attempt. Inspect the sync output and keep the last known-good archive published.

### 6. Run the full verification suite

```bash
npm run validate:data
npm run lint
npm run typecheck
npm test
npm run build
```

Every command must pass before publishing updated data.

### 7. Review the changes

```bash
git status --short
git diff --stat
git diff -- data/releases.json
git diff -- data/sync-metadata.json
git diff -- data/cases.json
```

Check that:

- Case and release counts changed only when expected.
- New records retain official source URLs.
- Release dates and media types match the official release.
- Retrieval metadata is current and reports `fresh`.
- No unrelated application or configuration files changed unexpectedly.

If `git status --short` is empty, the archive is already current. Do not create
an empty commit or pull request; switch back to `main` and delete the unused
local branch when convenient.

### 8. Commit and push a real data update

```bash
git add data/
git commit -m "chore(data): sync official UFO release data"
git push -u origin manual/war-ufo-sync-YYYY-MM-DD
```

Use the same dated branch name created in step 2.

### 9. Open and review the pull request

Open a pull request into `main` with the title:

```text
chore(data): sync official UFO release data
```

Record the commands run in the pull-request description. Review the data diff
and merge only after CI passes and `data/sync-metadata.json` is still `fresh`.
The normal Vercel deployment will publish the data after the PR is merged.

## Failure handling

- `403` or another source error: do not treat missing live data as proof that no
  new release exists. Leave the last known-good archive published.
- `partial` or `failed`: do not publish the attempt and do not hand-edit the
  status to `fresh`.
- Validation or build failure: fix the cause on the sync branch and rerun the
  complete verification suite.
- Unexpected removals or large count changes: compare the official release and
  investigate before committing.

## Cadence

A Codex reminder should prompt the maintainer every two weeks to run this guide.
The reminder is operational assistance only; it does not fetch, modify, commit,
or publish archive data automatically.
