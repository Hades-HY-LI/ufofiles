import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { buildCaseGraph } from "../lib/relationships";
import {
  CaseRecordSchema,
  ReleaseRecordSchema,
  SyncMetadataSchema,
  mediaTypes
} from "../lib/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const approvedSourceHosts = new Set([
  "www.war.gov",
  "war.gov",
  "www.dvidshub.net",
  "d34w7g4gy10iej.cloudfront.net"
]);

const approvedBundleHosts = new Set([
  "www.war.gov",
  "war.gov",
  "d34w7g4gy10iej.cloudfront.net"
]);

const OfficialBundleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  releaseTag: z.string().regex(/^release-\d+$/),
  type: z.enum(mediaTypes),
  mode: z.enum(["aggregate", "zip-entries"]),
  agency: z.string().min(1),
  summary: z.string().min(1),
  sourcePageUrl: z.string().url().optional()
});

const OfficialBundleRegistrySchema = z.object({
  notes: z.string().optional(),
  bundles: OfficialBundleSchema.array()
});

const OfficialReleasePagesSchema = z.object({
  notes: z.string().optional(),
  pages: z
    .object({
      url: z.string().url(),
      kind: z.enum(["portal", "release", "release-search"]).optional()
    })
    .array()
});

async function main() {
  const [cases, releases, metadata, bundleRegistry, releasePages] = await Promise.all([
    readJson("data/cases.json", CaseRecordSchema.array()),
    readJson("data/releases.json", ReleaseRecordSchema.array()),
    readJson("data/sync-metadata.json", SyncMetadataSchema),
    readJson("data/official-bundles.json", OfficialBundleRegistrySchema),
    readJson("data/official-release-pages.json", OfficialReleasePagesSchema)
  ]);

  const errors: string[] = [];

  assertUnique(cases.map((item) => item.id), "case id", errors);
  assertUnique(releases.map((item) => item.id), "release id", errors);
  assertUnique(bundleRegistry.bundles.map((item) => item.id), "official bundle id", errors);
  assertUnique(bundleRegistry.bundles.map((item) => item.url), "official bundle URL", errors);
  assertUnique(releasePages.pages.map((item) => item.url), "official release page URL", errors);

  for (const caseRecord of cases) {
    assertApprovedHost(caseRecord.sourceUrl, approvedSourceHosts, `case ${caseRecord.id} sourceUrl`, errors);
    if (caseRecord.mediaUrl) {
      assertApprovedHost(caseRecord.mediaUrl, approvedSourceHosts, `case ${caseRecord.id} mediaUrl`, errors);
    }
    if (!caseRecord.tags.includes("official")) {
      errors.push(`case ${caseRecord.id} is missing the official tag`);
    }
    if (caseRecord.latitude === null && caseRecord.longitude !== null) {
      errors.push(`case ${caseRecord.id} has longitude without latitude`);
    }
    if (caseRecord.latitude !== null && caseRecord.longitude === null) {
      errors.push(`case ${caseRecord.id} has latitude without longitude`);
    }
  }

  for (const release of releases) {
    assertApprovedHost(release.sourceUrl, approvedSourceHosts, `release ${release.id} sourceUrl`, errors);
    const matchingCases = cases.filter(
      (caseRecord) => caseRecord.releaseDate === release.releaseDate
    );
    if (matchingCases.length !== release.fileCount) {
      errors.push(
        `release ${release.id} fileCount is ${release.fileCount}, but ${matchingCases.length} cases have releaseDate ${release.releaseDate}`
      );
    }
  }

  const datedReleases = releases
    .filter((release): release is typeof release & { releaseDate: string } => Boolean(release.releaseDate))
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  for (const [index, release] of datedReleases.entries()) {
    const expectedId = `pursue-release-${String(index + 1).padStart(2, "0")}`;
    if (release.id !== expectedId) {
      errors.push(
        `release ${release.id} is out of sequence for ${release.releaseDate}; expected ${expectedId}`
      );
    }
    const expectedTag = expectedId.replace(/^pursue-/, "");
    const matchingCases = cases.filter((caseRecord) => caseRecord.releaseDate === release.releaseDate);
    for (const caseRecord of matchingCases) {
      if (!caseRecord.tags.includes(expectedTag)) {
        errors.push(`case ${caseRecord.id} is missing derived release tag ${expectedTag}`);
      }
      const expectedQuery = `releaseDate=Release+${String(index + 1).padStart(2, "0")}`;
      if (caseRecord.tags.includes("csv") && !caseRecord.sourceUrl.includes(expectedQuery)) {
        errors.push(`case ${caseRecord.id} sourceUrl is missing ${expectedQuery}`);
      }
    }
  }

  if (metadata.totalRecords !== cases.length) {
    errors.push(
      `sync metadata totalRecords is ${metadata.totalRecords}, but cases.json has ${cases.length}`
    );
  }
  if (metadata.status === "fresh" && metadata.sourceError) {
    errors.push("fresh sync metadata must not contain sourceError");
  }
  if (metadata.status !== "fresh" && metadata.lastAttemptedAt && !metadata.sourceError) {
    errors.push(`${metadata.status} sync metadata is missing sourceError`);
  }

  const caseIds = new Set(cases.map((item) => item.id));
  for (const id of [...metadata.latestNewCaseIds, ...metadata.latestChangedCaseIds]) {
    if (!caseIds.has(id)) errors.push(`sync metadata references missing case id ${id}`);
  }

  for (const bundle of bundleRegistry.bundles) {
    assertApprovedHost(bundle.url, approvedBundleHosts, `official bundle ${bundle.id} url`, errors);
    if (bundle.sourcePageUrl) {
      assertApprovedHost(
        bundle.sourcePageUrl,
        new Set(["www.war.gov", "war.gov"]),
        `official bundle ${bundle.id} sourcePageUrl`,
        errors
      );
    }
    if (!/\.zip(\?|$)/i.test(new URL(bundle.url).pathname)) {
      errors.push(`official bundle ${bundle.id} is not a ZIP URL`);
    }
  }

  for (const page of releasePages.pages) {
    assertApprovedHost(
      page.url,
      new Set(["www.war.gov", "war.gov"]),
      `official release page ${page.url}`,
      errors
    );
  }

  const graph = buildCaseGraph(cases);
  const graphNodeIds = new Set(graph.nodes.map((node) => node.id));
  if (!graph.nodes.length) errors.push("relationship graph has no nodes");
  if (!graph.edges.length) errors.push("relationship graph has no edges");
  for (const edge of graph.edges) {
    if (!graphNodeIds.has(edge.source) || !graphNodeIds.has(edge.target)) {
      errors.push(`relationship graph edge references a missing selected node: ${edge.source} -> ${edge.target}`);
    }
    if (!edge.reasons.length) {
      errors.push(`relationship graph edge ${edge.source} -> ${edge.target} has no reason`);
    }
  }

  if (errors.length) {
    console.error(`Data validation failed with ${errors.length} issue(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Validated ${cases.length} cases, ${releases.length} releases, ${bundleRegistry.bundles.length} official bundle(s), and a graph with ${graph.nodes.length} nodes / ${graph.edges.length} edges.`
  );
}

async function readJson<T>(relativePath: string, schema: z.ZodType<T>) {
  const raw = await readFile(path.join(root, relativePath), "utf8");
  return schema.parse(JSON.parse(raw));
}

function assertUnique(values: string[], label: string, errors: string[]) {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) errors.push(`duplicate ${label}: ${value}`);
    seen.add(value);
  }
}

function assertApprovedHost(
  url: string,
  approvedHosts: Set<string>,
  label: string,
  errors: string[]
) {
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase();
  if (parsed.protocol !== "https:") errors.push(`${label} must use HTTPS`);
  if (parsed.username || parsed.password) errors.push(`${label} must not contain credentials`);
  if (parsed.port && parsed.port !== "443") errors.push(`${label} uses disallowed port ${parsed.port}`);
  if (!approvedHosts.has(host)) {
    errors.push(`${label} uses unapproved host ${host}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
