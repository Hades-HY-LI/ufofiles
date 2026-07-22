# UFO Files Archive

A static-first archive for official UFO/UAP records published at `war.gov/ufo`.

The MVP is a Next.js app backed by repo-local JSON. It emphasizes provenance,
browsability, and a sober public-data interface over commentary or speculation.

This is an independent fan archive and is not affiliated with the U.S. government.

## MVP Goals

- Browse official cases with title, date, location, category, summary, tags, and source links.
- Explore records by list, release tracker, map, timeline, relationship graph, and case detail pages.
- Show sync freshness through a visible banner when data is stale, incomplete, or the official source cannot be reached.
- Deploy cleanly to Vercel as a static JSON-backed app.

## How Codex and GPT-5.6 Were Used Throughout the Project

UFO Files Archive was built independently, with Codex serving as the primary AI
development partner from early product exploration through the final
hackathon-ready release. The project evolved alongside several Codex model
releases; the final major product, design, and engineering pass used GPT-5.6 in
Codex with medium reasoning effort.

The workflow was conversational: ideas, problems, and desired behavior were
described in natural language, then Codex helped turn them into plans, code,
tests, documentation, and reviewable changes. Its most important contributions
spanned the entire project:

### Product Strategy and Architecture

- Turned the original idea of a central home for government UFO files into a
  scoped, source-first product with clear user flows and acceptance criteria.
- Helped define the official-source-only policy, provenance requirements, sync
  health states, and the boundary between factual archive data and speculative
  product ideas.
- Designed the static-first architecture: Next.js, React, and TypeScript backed
  by validated repo-local JSON, with no application database or required
  runtime secrets.
- Kept the deployment model simple enough for Vercel while preserving public
  machine-readable data and stable case routes.

### Official Data Discovery and Synchronization

- Investigated how `war.gov/ufo` publishes pages, CSV data, documents, media,
  release pages, DVIDS embeds, and large official ZIP bundles.
- Built the discovery and normalization scripts that produce stable case,
  release, and sync-metadata JSON.
- Developed multiple official-source fallback paths for the site's intermittent
  `403` responses: the official CSV export, a reviewed URL manifest, official
  release-page discovery, and ZIP central-directory range reads that avoid
  downloading multi-gigabyte archives merely to list their contents.
- Added defensive network handling, approved-host checks, bounded responses,
  redirect validation, stable identifiers, source preservation, and freshness
  reporting.
- Explored GitHub Actions and a dedicated self-hosted runner for automation,
  then helped evaluate the operational tradeoff and simplify the final process
  to a maintainer-reviewed biweekly manual sync. The optional workflow remains
  available for diagnostics and recovery.

### Interface Design and Feature Development

- Helped move the product from an early dark archival concept to the current
  bright, Vercel-inspired public-data interface while retaining a credible,
  non-sensational tone.
- Used design conversations and image-generation-assisted exploration to turn
  visual ideas into responsive React components and a consistent design system.
- Implemented and refined archive search and filters, release tracking, case
  pages, official media handling, the scroll-driven release timeline, and
  mobile and keyboard behavior.
- Built the interactive map experience around the archive's coordinate data,
  including custom Web Mercator projection, CARTO tiles, filtering, selection,
  pan and zoom behavior, unmapped-record handling, and official-source actions.
- Built the D3-force relationship graph and its archive-computed connections,
  then added validation so every node, edge, score, and relationship reason can
  be traced back to normalized records. This graph is also the foundation for
  future semantic relationship analysis.

### Debugging, Quality, and Guardrails

- Used Codex to reproduce UI, data, sync, indexing, and build failures; compare
  alternative fixes; and implement targeted corrections rather than broad
  rewrites.
- Added Zod schemas, data validation, TypeScript checks, sync regression tests,
  linting, production builds, freshness gates, and last-known-good-data behavior.
- Improved accessibility, responsive layouts, reduced-motion considerations,
  search-engine metadata, JSON-LD, canonical URLs, sitemap and robots output,
  `llms.txt`, and public JSON endpoints for agents and researchers.
- Organized larger tasks through role-based agent teams with bounded file
  ownership, specialist review, verification steps, and explicit handoffs.
  These guardrails reduced the risk of overlapping edits and unchecked
  AI-generated changes.

### Documentation, Operations, and Launch

- Drafted and maintained the product spec, architecture notes, data contract,
  design direction, test plan, deployment guide, sync runbooks, and manual
  release checklist alongside the implementation.
- Helped prepare the project story, technical summary, demo script, video
  direction, screenshots, and other hackathon presentation material.
- Made it practical for one developer to move between product strategy, design,
  frontend engineering, data tooling, testing, and release operations without
  losing the decisions and constraints behind the work.

### Human Ownership and Source Integrity

Codex accelerated the work, but it was never treated as an autonomous source of
truth. The maintainer selected the product direction, made the final design and
operational decisions, reviewed generated code and data changes, ran the
verification workflow, and decided what shipped. Codex was used to build the
archive, not to invent its contents: no AI-generated case facts are included,
and every public record remains attributable to an approved official source.

## Source Policy

The archive is official-source only for case data. The canonical source is:

```text
https://war.gov/ufo
```

Each normalized record should retain:

- Official source URL.
- Original document or media URL when available.
- Normalization notes for any inferred fields.

`data/sync-metadata.json` records the archive retrieval timestamp and sync result.

Non-official material can be used only as implementation notes or external references, not as case facts.

## License And Attribution

Code is released under the MIT License. See `LICENSE`.

Official government source data, document links, media links, and release metadata remain attributed to their official sources, primarily `https://www.war.gov/ufo/`. This project organizes and links to public official-source materials; it does not claim ownership of those government records.

## Expected Project Commands

When the Next.js package is present, the project should expose:

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

Recommended local flow:

```bash
npm run discover:war-bundles
npm run sync:war
npm run validate:data
npm run lint
npm run typecheck
npm test
npm run build
```

## Data Update Operations

The archive currently uses a maintainer-reviewed manual sync. Run the complete
process every two weeks and whenever War.gov announces a new release. Normal new
release batches do not require code changes; the sync discovers release dates
dynamically. Every update must produce `fresh` sync metadata, pass validation,
and be reviewed in a pull request before deployment.

Follow [`docs/MANUAL_SYNC.md`](docs/MANUAL_SYNC.md) for the exact commands,
review checklist, failure handling, commit, and pull-request steps. The GitHub
Actions sync workflow is manual-dispatch only and is retained as an optional
diagnostic/recovery tool; it is not the archive's scheduled update mechanism.

## Static Data Contract

The app should read static JSON from `data/` at build time. The minimum expected files are:

- `data/cases.json`: normalized case list.
- `data/releases.json`: official PURSUE release records.
- `data/sync-metadata.json`: last sync result and banner inputs.
- `https://www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv`: primary official data export used by sync when reachable.
- `data/war-ufo-manifest.json`: official URL fallback for cases where `war.gov/ufo` blocks server-side fetches.
- `data/official-release-pages.json`: official War.gov pages scanned for release and bundle discovery.
- `data/official-bundles.json`: official release bundle registry for fallback ZIP metadata ingestion.

The sync script first reads War.gov's official CSV export, which includes
documents, images, videos, and audio records. The discovery step separately
scans the official portal, official War.gov release search, and known official
release pages for ZIP bundle links, then updates `data/official-bundles.json`.
The sync script reads that registry when Akamai blocks direct page or CSV
fetches. For reachable ZIPs, it can list the central directory by HTTP range
request and normalize official bundle entries without downloading
multi-gigabyte media archives.

See `docs/DATA_MODEL.md` for the field contract.

## Documentation

- `docs/PRODUCT_SPEC.md`: MVP product behavior.
- `docs/DESIGN_DOC.md`: app architecture and routes.
- `docs/DESIGN.md`: current UX direction and interaction roadmap.
- `docs/DATA_MODEL.md`: JSON data schema.
- `docs/MANUAL_SYNC.md`: biweekly maintainer sync procedure.
- `docs/SYNC_RUNBOOK.md`: official-source sync behavior.
- `docs/DESIGN_SYSTEM.md`: approved dark archival UI direction.
- `docs/IDEAS.md`: product ideas that preserve the official-source policy.
- `docs/DEPLOYMENT.md`: Vercel deployment notes.
- `docs/TEST_PLAN.md`: verification plan.
- `docs/TOOLS_AND_SKILLS.md`: project tools and maintainer workflow.
