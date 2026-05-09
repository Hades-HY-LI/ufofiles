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
npm run sync:war
npm run build
npm run lint
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

1. Run or update sync.
2. Inspect JSON changes.
3. Run build, lint, and tests.
4. Spot-check key routes.
5. Deploy to Vercel.

## Documentation Ownership

Use these files to keep decisions explicit:

- `README.md`
- `AGENTS.md`
- `docs/PRODUCT_SPEC.md`
- `docs/DESIGN_DOC.md`
- `docs/DATA_MODEL.md`
- `docs/SYNC_RUNBOOK.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/DEPLOYMENT.md`
- `docs/TEST_PLAN.md`
- `docs/TOOLS_AND_SKILLS.md`
