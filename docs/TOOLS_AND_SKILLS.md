# Tools and Skills

## Core Stack

- Next.js for the static web app.
- React for UI components.
- Repo-local JSON for MVP data.
- Vercel for hosting.
- Node/npm scripts for sync, build, lint, and tests.

## Expected Commands

```bash
npm install
npm run dev
npm run discover:war-bundles
npm run sync:war
npm run validate:data
npm run build
npm run lint
npm run typecheck
npm test
```

## Maintainer Skills

- Normalize official records without adding unsupported facts.
- Preserve source provenance and retrieval timestamps.
- Keep dark archival UI patterns consistent.
- Validate static JSON before deploy.
- Read sync status and decide whether a banner should be shown.

## Source Handling

Use official `war.gov/ufo` material as the source of record. External sources may help a maintainer discover context, but they must not become case data in the MVP.

## Development Workflow

Application development and data synchronization are separate workflows.

For data updates, follow `docs/MANUAL_SYNC.md` every two weeks and when a new
official release appears:

1. Update `main` and create a dated sync branch.
2. Run discovery and sync locally.
3. Require `fresh` metadata and inspect JSON changes.
4. Run validation, lint, type checking, tests, and the production build.
5. Open and review a data PR; deploy through the normal merge path.

## Documentation Ownership

Use these files to keep decisions explicit:

- `README.md`
- `AGENTS.md`
- `docs/PRODUCT_SPEC.md`
- `docs/DESIGN_DOC.md`
- `docs/DATA_MODEL.md`
- `docs/MANUAL_SYNC.md`
- `docs/SYNC_RUNBOOK.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/DEPLOYMENT.md`
- `docs/TEST_PLAN.md`
- `docs/TOOLS_AND_SKILLS.md`
