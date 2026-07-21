import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { CaseRecord, MediaType, ReleaseRecord, SyncMetadata } from "../lib/types";
import {
  isValidatedHttpsUrl,
  readBytesBounded,
  readTextBounded,
  safeFetch,
  validatedHttpsUrl
} from "./war-ufo-network";

const SOURCE_URL = "https://www.war.gov/ufo/";
const CSV_URL = "https://www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv";
const WAR_HOSTS = new Set(["war.gov", "www.war.gov"]);
const BUNDLE_HOSTS = new Set([...WAR_HOSTS, "d34w7g4gy10iej.cloudfront.net"]);
const IDENTITY_MEDIA_HOSTS = new Set([...BUNDLE_HOSTS, "www.dvidshub.net"]);
const MAX_CSV_BYTES = 10 * 1024 * 1024;
const MAX_HTML_BYTES = 5 * 1024 * 1024;
const MAX_ZIP_TAIL_BYTES = 1024 * 1024;
const MAX_ZIP_BYTES = 100 * 1024 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 100_000;
const MAX_CENTRAL_DIRECTORY_BYTES = 64 * 1024 * 1024;
const FORCE_FALLBACK = process.env.WAR_UFO_FORCE_FALLBACK === "1";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

export type Discovery = {
  id?: string;
  title: string;
  sourceUrl: string;
  mediaUrl: string | null;
  releaseDate: string | null;
  incidentDate?: string | null;
  locationName?: string;
  latitude?: number | null;
  longitude?: number | null;
  agency: string;
  type: MediaType;
  summary: string;
  tags?: string[];
};

type ManifestRecord = {
  id?: string;
  title: string;
  mediaUrl: string | null;
  sourceUrl?: string;
  releaseDate?: string | null;
  incidentDate?: string | null;
  locationName?: string;
  latitude?: number | null;
  longitude?: number | null;
  agency?: string;
  type?: MediaType;
  summary?: string;
  tags?: string[];
};

type WarUfoManifest = {
  sourceUrl: string;
  generatedAt: string;
  notes: string;
  records: ManifestRecord[];
};

type OfficialBundle = {
  id: string;
  title: string;
  url: string;
  releaseDate: string;
  releaseTag: string;
  type: MediaType;
  mode: "aggregate" | "zip-entries";
  agency: string;
  summary: string;
};

type OfficialBundleRegistry = {
  notes?: string;
  bundles: OfficialBundle[];
};

async function main() {
  const [previousCases, previousReleases, previousMetadata] = await Promise.all([
    readJson<CaseRecord[]>("data/cases.json"),
    readJson<ReleaseRecord[]>("data/releases.json"),
    readJson<SyncMetadata>("data/sync-metadata.json")
  ]);

  let discoveries: Discovery[];
  let status: SyncMetadata["status"] = "fresh";
  const attemptedAt = new Date().toISOString();
  const previousSuccessfulAt =
    previousMetadata.lastSuccessfulAt ??
    (previousMetadata.status === "fresh" ? previousMetadata.lastSyncedAt : undefined);
  let successfulAt: string | undefined;
  let csvSha256: string | undefined;
  let csvLastModified: string | undefined;
  let sourceError: string | undefined;
  try {
    const csvResult = await fetchOfficialCsv();
    discoveries = discoverCsvRecords(csvResult.text);
    assertCumulativeSnapshot(previousCases, discoveries);
    successfulAt = attemptedAt;
    csvSha256 = createHash("sha256").update(csvResult.text).digest("hex");
    csvLastModified = csvResult.lastModified;
    console.log(`Read ${discoveries.length} official records from ${CSV_URL}.`);
  } catch (error) {
    const csvError = errorMessage(error);
    console.warn(
      `Official CSV unavailable; trying live portal HTML. ${csvError}`
    );
    try {
      const html = await fetchSource();
      discoveries = discoverRecords(html);
      status = "partial";
      sourceError = `CSV unavailable: ${csvError}`;
    } catch (portalError) {
      const portalErrorMessage = errorMessage(portalError);
      discoveries = await loadManifestDiscoveries();
      status = discoveries.length ? "partial" : "failed";
      sourceError = `CSV unavailable: ${csvError}; portal unavailable: ${portalErrorMessage}`;
      if (!discoveries.length) {
        const metadata = buildMetadata(previousCases, previousCases, status, {
          attemptedAt,
          lastSuccessfulAt: previousSuccessfulAt,
          sourceError
        });
        await writeJson("data/sync-metadata.json", metadata);
        console.warn(
          `Sync source unavailable; preserved ${previousCases.length} existing records. ${portalErrorMessage}`
        );
        return;
      }
      console.warn(
        `Live source unavailable; using manifest fallback with ${discoveries.length} official URLs. ${
          portalErrorMessage
        }`
      );
    }
  }
  const mergedCases =
    status === "partial"
      ? mergePartialFallbackCases(previousCases, discoveries)
      : mergeCases(previousCases, discoveries);
  const releases = buildReleases(mergedCases);
  const computedMetadata = buildMetadata(previousCases, mergedCases, status, {
    attemptedAt,
    lastSuccessfulAt: successfulAt ?? previousSuccessfulAt,
    csvSha256,
    csvLastModified,
    sourceError
  });
  const preserveFreshMetadata = shouldPreserveFreshMetadata({
    status,
    previousMetadata,
    computedMetadata,
    previousCases,
    nextCases: mergedCases,
    previousReleases,
    nextReleases: releases,
    csvSha256
  });
  const metadata = preserveFreshMetadata ? previousMetadata : computedMetadata;

  await Promise.all([
    writeJson("data/cases.json", mergedCases),
    writeJson("data/releases.json", releases),
    writeJson("data/sync-metadata.json", metadata)
  ]);

  console.log(
    `Synced ${mergedCases.length} records from ${SOURCE_URL}: ${computedMetadata.newRecordCount} new, ${computedMetadata.changedRecordCount} changed, status ${metadata.status}${
      preserveFreshMetadata ? "; preserved metadata for identical fresh input" : ""
    }.`
  );

}

async function fetchOfficialCsv(): Promise<{ text: string; lastModified?: string }> {
  if (FORCE_FALLBACK) {
    throw new Error("WAR_UFO_FORCE_FALLBACK requested");
  }
  const response = await safeFetch(CSV_URL, {
    allowedHosts: WAR_HOSTS,
    cache: "no-store",
    headers: {
      accept: "text/csv,application/octet-stream,text/plain",
      "cache-control": "no-cache"
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${CSV_URL}: ${response.status}`);
  }
  return {
    text: await readTextBounded(response, MAX_CSV_BYTES),
    lastModified: response.headers.get("last-modified") ?? undefined
  };
}

async function fetchSource() {
  if (FORCE_FALLBACK) {
    throw new Error("WAR_UFO_FORCE_FALLBACK requested");
  }
  const response = await safeFetch(SOURCE_URL, {
    allowedHosts: WAR_HOSTS,
    headers: {
      "user-agent":
        "UFO Files Archive non-commercial fan archive sync (+https://www.war.gov/ufo/)"
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${response.status}`);
  }
  return readTextBounded(response, MAX_HTML_BYTES);
}

export function discoverCsvRecords(csv: string): Discovery[] {
  const [rawHeader, ...rows] = parseCsv(csv);
  if (!rawHeader) throw new Error("Official CSV is empty");
  const header = rawHeader.map(normalizeCsvHeader);
  const column = (name: string) => header.indexOf(normalizeCsvHeader(name));
  const index = {
    redaction: column("Redaction"),
    releaseDate: column("Release Date"),
    title: column("Title"),
    type: column("Type"),
    description: column("Description Blurb"),
    dvidsId: column("DVIDS Video ID"),
    agency: column("Agency"),
    incidentDate: column("Incident Date"),
    location: column("Incident Location"),
    assetUrl: column("PDF | Image Link"),
    imageUrl: column("Modal Image"),
    virin: column("Image VIRIN")
  };

  const requiredColumns = ["Release Date", "Title", "Type", "Agency"];
  const missingColumns = requiredColumns.filter((name) => column(name) < 0);
  if (missingColumns.length) {
    throw new Error(`Official CSV is missing required column(s): ${missingColumns.join(", ")}`);
  }

  const populatedRows = rows.filter((row) => row.some((value) => value.trim()));
  if (!populatedRows.length) throw new Error("Official CSV contains no records");
  const normalizedReleaseDates = populatedRows.map((row, rowIndex) => {
    const rawDate = valueAt(row, index.releaseDate);
    const date = normalizeReleaseDate(rawDate);
    if (!date || !isSaneReleaseDate(date)) {
      throw new Error(`Official CSV row ${rowIndex + 2} has invalid Release Date: ${rawDate || "(blank)"}`);
    }
    return date;
  });
  const releaseTags = buildReleaseTagMap(normalizedReleaseDates);

  const discoveries = populatedRows.map((row, rowIndex) => {
      const title = cleanTitle(valueAt(row, index.title)) || "Official UAP record";
      const releaseDate = normalizedReleaseDates[rowIndex];
      const type = mediaTypeFromCsv(valueAt(row, index.type));
      const assetUrl = valueAt(row, index.assetUrl);
      const imageUrl = valueAt(row, index.imageUrl);
      const dvidsIds = parseDvidsIds(valueAt(row, index.dvidsId));
      const releaseTag = releaseTags.get(releaseDate);
      if (!releaseTag) throw new Error(`No release tag generated for ${releaseDate}`);
      const sourceUrl = warRecordUrl(title, releaseTag);
      const mediaUrl =
        toOfficialAssetUrl(assetUrl) ??
        toOfficialAssetUrl(imageUrl) ??
        dvidsEmbedUrl(dvidsIds[0], type);
      const locationName = normalizeLocation(valueAt(row, index.location));

      return {
        id: `pursue-${releaseTag}-${slug(title).slice(0, 86)}`,
        title,
        sourceUrl,
        mediaUrl,
        releaseDate,
        incidentDate: normalizeIncidentDate(valueAt(row, index.incidentDate)),
        locationName,
        latitude: coordinatesForLocation(locationName)?.latitude ?? null,
        longitude: coordinatesForLocation(locationName)?.longitude ?? null,
        agency: valueAt(row, index.agency) || inferAgency(title),
        type,
        summary:
          valueAt(row, index.description) ||
          `Official UAP-related ${type} listed in the War.gov PURSUE data export.`,
        tags: [
          "official",
          "uap",
          "pursue",
          "csv",
          releaseTag,
          type,
          valueAt(row, index.redaction).toLowerCase() === "true" ? "redacted" : "",
          dvidsIds.length ? "dvids" : "",
          valueAt(row, index.virin) ? "virin" : ""
        ].filter(Boolean)
      };
    });

  const ids = new Set<string>();
  for (const discovery of discoveries) {
    if (!discovery.id || ids.has(discovery.id)) {
      throw new Error(`Official CSV produced duplicate record id: ${discovery.id ?? "(blank)"}`);
    }
    ids.add(discovery.id);
  }
  return discoveries;
}

function discoverRecords(html: string): Discovery[] {
  const $ = cheerio.load(html);
  const discoveries = new Map<string, Discovery>();
  const pageText = $("body").text().replace(/\s+/g, " ");
  const releaseDate = findIsoDate(pageText) ?? "2026-05-08";

  $("a[href], source[src], video[src], img[src]").each((_, element) => {
    const rawUrl = $(element).attr("href") ?? $(element).attr("src");
    if (!rawUrl) return;

    const absoluteUrl = toAbsoluteUrl(rawUrl);
    if (!absoluteUrl) return;
    if (!isPotentialOfficialAsset(absoluteUrl)) return;

    const text =
      $(element).text().trim() ||
      $(element).attr("alt") ||
      $(element).attr("title") ||
      path.basename(new URL(absoluteUrl).pathname);

    const title = cleanTitle(text) || titleFromUrl(absoluteUrl);
    const type = inferType(absoluteUrl, title);
    const key = absoluteUrl;

    discoveries.set(key, {
      title,
      sourceUrl: SOURCE_URL,
      mediaUrl: absoluteUrl === SOURCE_URL ? null : absoluteUrl,
      releaseDate,
      agency: inferAgency(`${title} ${pageText}`),
      type,
      summary:
        type === "unknown"
          ? "Official UAP-related record discovered on the PURSUE release portal."
          : `Official UAP-related ${type} discovered on the PURSUE release portal.`
    });
  });

  $("tr").each((_, row) => {
    const cells = $(row)
      .find("th, td")
      .map((__, cell) => $(cell).text().trim())
      .get()
      .filter(Boolean);
    if (cells.length < 2) return;
    const combined = cells.join(" ");
    if (!/release|file|uap|ufo|pursue/i.test(combined)) return;
    const link = $(row).find("a[href]").first().attr("href");
    const sourceUrl = link ? toAbsoluteUrl(link) ?? SOURCE_URL : SOURCE_URL;
    const title = cleanTitle(cells[0]) || cleanTitle(combined) || "Official UAP record";
    const mediaUrl = sourceUrl !== SOURCE_URL && isPotentialOfficialAsset(sourceUrl) ? sourceUrl : null;
    discoveries.set(`${title}-${sourceUrl}`, {
      title,
      sourceUrl: SOURCE_URL,
      mediaUrl,
      releaseDate: findIsoDate(combined) ?? releaseDate,
      agency: inferAgency(combined),
      type: inferType(sourceUrl, combined),
      summary: `Official UAP-related record listed by the PURSUE release portal: ${combined.slice(0, 220)}`
    });
  });

  if (!discoveries.size) {
    discoveries.set("pursue-release-index", {
      title: "PURSUE official release portal",
      sourceUrl: SOURCE_URL,
      mediaUrl: null,
      releaseDate,
      agency: "Department of War",
      type: "document",
      summary:
        "Official PURSUE release portal. No individual downloadable records were detected during this sync."
    });
  }

  return [...discoveries.values()];
}

export function mergeCases(previousCases: CaseRecord[], discoveries: Discovery[]) {
  const previousById = new Map(previousCases.map((item) => [item.id, item]));
  const previousByOfficialKey = uniqueOfficialRecordIndex(previousCases);
  const discoveriesByOfficialKey = uniqueOfficialRecordIndex(discoveries);
  const merged = new Map<string, CaseRecord>();

  for (const discovery of discoveries) {
    const generatedId = stableId(discovery);
    let id = generatedId;
    let previous = previousById.get(generatedId);

    if (!previous) {
      const officialKey = officialRecordKey(discovery);
      const priorMatch = officialKey ? previousByOfficialKey.get(officialKey) : undefined;
      const incomingMatch = officialKey ? discoveriesByOfficialKey.get(officialKey) : undefined;
      if (priorMatch && incomingMatch === discovery && !merged.has(priorMatch.id)) {
        id = priorMatch.id;
        previous = priorMatch;
      }
    }

    merged.set(id, caseFromDiscovery(discovery, previous, id));
  }

  return sortCases([...merged.values()]);
}

function mergePartialFallbackCases(previousCases: CaseRecord[], discoveries: Discovery[]) {
  const merged = new Map(previousCases.map((item) => [item.id, item]));
  const representedReleaseDates = new Set(previousCases.map((item) => item.releaseDate));
  let skippedFallbackRecords = 0;

  for (const discovery of discoveries) {
    const id = stableId(discovery);
    if (merged.has(id)) continue;

    if (representedReleaseDates.has(discovery.releaseDate ?? null)) {
      skippedFallbackRecords += 1;
      continue;
    }

    merged.set(id, caseFromDiscovery(discovery));
  }

  if (skippedFallbackRecords) {
    console.warn(
      `Preserved existing row-level records and skipped ${skippedFallbackRecords} lower-detail fallback record(s).`
    );
  }

  return sortCases([...merged.values()]);
}

function caseFromDiscovery(
  discovery: Discovery,
  previous?: CaseRecord,
  id = stableId(discovery)
): CaseRecord {
  const coordinates = coordinatesForLocation(discovery.locationName);

  return {
    id,
    title: discovery.title || previous?.title || "Official UAP record",
    agency: discovery.agency || previous?.agency || "Unknown agency",
    releaseDate: discovery.releaseDate ?? previous?.releaseDate ?? null,
    incidentDate: discovery.incidentDate ?? previous?.incidentDate ?? null,
    locationName:
      discovery.locationName ?? previous?.locationName ?? "Unknown location",
    latitude: discovery.latitude ?? previous?.latitude ?? coordinates?.latitude ?? null,
    longitude:
      discovery.longitude ?? previous?.longitude ?? coordinates?.longitude ?? null,
    type: discovery.type || previous?.type || "unknown",
    sourceUrl: discovery.sourceUrl || previous?.sourceUrl || SOURCE_URL,
    mediaUrl:
      discovery.mediaUrl ??
      (discovery.type === "document" && !discovery.tags?.includes("bundle")
        ? discovery.sourceUrl
        : null) ??
      previous?.mediaUrl ??
      null,
    summary: discovery.summary || previous?.summary || "Official UAP-related record.",
    tags: mergeTags(previous?.tags ?? [], [
      "official",
      "uap",
      "pursue",
      discovery.type,
      ...(discovery.tags ?? [])
    ]),
    confidence: previous?.confidence ?? "official-source"
  };
}

type OfficialIdentityRecord = {
  title: string;
  releaseDate: string | null;
};

function uniqueOfficialRecordIndex<T extends OfficialIdentityRecord>(records: T[]) {
  const index = new Map<string, T | null>();
  for (const record of records) {
    const key = officialRecordKey(record);
    if (!key) continue;
    index.set(key, index.has(key) ? null : record);
  }
  return index;
}

function officialRecordKey(record: OfficialIdentityRecord) {
  if (!record.releaseDate) return null;
  const identifier = record.title.match(
    /\b([A-Z][A-Z0-9]{1,9})[-_\s]+UAP[-_\s]+([A-Z]{0,3}\d+[A-Z]?)\b/i
  );
  if (!identifier) return null;
  return `${record.releaseDate}:${identifier[1].toUpperCase()}-UAP-${identifier[2].toUpperCase()}`;
}

function sortCases(cases: CaseRecord[]) {
  return cases.sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
}

export function buildReleases(cases: CaseRecord[]) {
  const grouped = new Map<string, CaseRecord[]>();
  const releases: ReleaseRecord[] = [];
  for (const caseRecord of cases) {
    const releaseTag =
      caseRecord.tags.find((tag) => /^release-\d+$/i.test(tag)) ??
      releaseTagForCases(cases, caseRecord.releaseDate);
    grouped.set(releaseTag, [...(grouped.get(releaseTag) ?? []), caseRecord]);
  }

  for (const [releaseTag, releaseCases] of grouped) {
    const releaseNumber = releaseTag.match(/\d+/)?.[0] ?? "01";
    const release: ReleaseRecord = {
      id: `pursue-${releaseTag}`,
      title: `PURSUE Release ${releaseNumber.padStart(2, "0")}`,
      releaseDate: releaseCases[0]?.releaseDate ?? null,
      sourceUrl: SOURCE_URL,
      fileCount: releaseCases.length,
      notes:
        "Automated sync record for official files detected on the PURSUE portal and official linked bundles."
    };
    releases.push(release);
  }

  return releases.sort((a, b) => (a.releaseDate ?? "").localeCompare(b.releaseDate ?? ""));
}

function releaseTagForCases(cases: CaseRecord[], releaseDate: string | null | undefined) {
  if (!releaseDate) return "release-unknown";
  return buildReleaseTagMap(
    cases.map((caseRecord) => caseRecord.releaseDate).filter((date): date is string => Boolean(date))
  ).get(releaseDate) ?? "release-unknown";
}

type MetadataHealth = {
  attemptedAt: string;
  lastSuccessfulAt?: string;
  csvSha256?: string;
  csvLastModified?: string;
  sourceError?: string;
};

export function buildMetadata(
  previousCases: CaseRecord[],
  nextCases: CaseRecord[],
  status: SyncMetadata["status"],
  health: MetadataHealth
): SyncMetadata {
  const previousById = new Map(previousCases.map((item) => [item.id, item]));
  const latestNewCaseIds: string[] = [];
  const latestChangedCaseIds: string[] = [];

  for (const next of nextCases) {
    const previous = previousById.get(next.id);
    if (!previous) {
      latestNewCaseIds.push(next.id);
      continue;
    }
    if (JSON.stringify(previous) !== JSON.stringify(next)) {
      latestChangedCaseIds.push(next.id);
    }
  }

  return {
    lastSyncedAt: health.attemptedAt,
    lastAttemptedAt: health.attemptedAt,
    ...(health.lastSuccessfulAt ? { lastSuccessfulAt: health.lastSuccessfulAt } : {}),
    sourceUrl: SOURCE_URL,
    sourceCsvUrl: CSV_URL,
    ...(health.csvSha256 ? { sourceCsvSha256: health.csvSha256 } : {}),
    ...(health.csvLastModified ? { sourceCsvLastModified: health.csvLastModified } : {}),
    ...(health.sourceError ? { sourceError: health.sourceError.slice(0, 1000) } : {}),
    totalRecords: nextCases.length,
    newRecordCount: latestNewCaseIds.length,
    changedRecordCount: latestChangedCaseIds.length,
    latestNewCaseIds,
    latestChangedCaseIds,
    status
  };
}

type FreshMetadataDecision = {
  status: SyncMetadata["status"];
  previousMetadata: SyncMetadata;
  computedMetadata: SyncMetadata;
  previousCases: CaseRecord[];
  nextCases: CaseRecord[];
  previousReleases: ReleaseRecord[];
  nextReleases: ReleaseRecord[];
  csvSha256?: string;
};

export function shouldPreserveFreshMetadata({
  status,
  previousMetadata,
  computedMetadata,
  previousCases,
  nextCases,
  previousReleases,
  nextReleases,
  csvSha256
}: FreshMetadataDecision) {
  return (
    status === "fresh" &&
    previousMetadata.status === "fresh" &&
    computedMetadata.status === "fresh" &&
    computedMetadata.newRecordCount === 0 &&
    computedMetadata.changedRecordCount === 0 &&
    JSON.stringify(previousCases) === JSON.stringify(nextCases) &&
    JSON.stringify(previousReleases) === JSON.stringify(nextReleases) &&
    Boolean(csvSha256) &&
    previousMetadata.sourceUrl === SOURCE_URL &&
    previousMetadata.sourceCsvUrl === CSV_URL &&
    previousMetadata.sourceCsvSha256 === csvSha256
  );
}

async function loadManifestDiscoveries(): Promise<Discovery[]> {
  const discoveries: Discovery[] = [];
  try {
    const manifest = await readJson<WarUfoManifest>("data/war-ufo-manifest.json");
    discoveries.push(...manifest.records.map((record) => ({
      id: record.id,
      title: record.title,
      sourceUrl: record.sourceUrl ?? manifest.sourceUrl ?? SOURCE_URL,
      mediaUrl: record.mediaUrl,
      releaseDate: normalizeReleaseDate(record.releaseDate) ?? "2026-05-08",
      incidentDate: normalizeIncidentDate(record.incidentDate),
      locationName: record.locationName ?? "Unknown location",
      latitude: record.latitude ?? null,
      longitude: record.longitude ?? null,
      agency: record.agency ?? inferAgency(`${record.title} ${record.mediaUrl ?? ""}`),
      type: record.type ?? inferType(record.mediaUrl ?? record.sourceUrl ?? "", record.title),
      summary:
        record.summary ??
        `Official UAP-related ${record.type ?? inferType(record.mediaUrl ?? record.sourceUrl ?? "", record.title)} from the PURSUE release portal manifest fallback.`,
      tags: record.tags ?? ["manifest-fallback"]
    })));
  } catch {
    // Continue to official bundle fallbacks below.
  }
  discoveries.push(...(await loadOfficialBundleDiscoveries()));
  return dedupeDiscoveries(discoveries);
}

async function loadOfficialBundleDiscoveries(): Promise<Discovery[]> {
  const discoveries: Discovery[] = [];
  const bundles = await loadOfficialBundles();

  for (const bundle of bundles) {
    if (bundle.mode === "aggregate") {
      discoveries.push({
        id: bundle.id,
        title: bundle.title,
        sourceUrl: bundle.url,
        mediaUrl: null,
        releaseDate: bundle.releaseDate,
        locationName: "Unknown location",
        agency: bundle.agency,
        type: bundle.type,
        summary: bundle.summary,
        tags: ["official", "pursue", bundle.releaseTag, "bundle", bundle.type]
      });
      continue;
    }

    try {
      const entries = await listRemoteZipEntries(bundle.url);
      for (const entry of entries.filter((item) => !item.name.endsWith("/"))) {
        const type = inferType(entry.name, entry.name);
        discoveries.push({
          id: `${bundle.id}-${slug(entry.name).slice(0, 72)}`,
          title: titleFromUrl(entry.name),
          sourceUrl: bundle.url,
          mediaUrl: null,
          releaseDate: bundle.releaseDate,
          locationName: "Unknown location",
          agency: bundle.agency,
          type: type === "unknown" ? bundle.type : type,
          summary: `${bundle.summary} ZIP entry: ${entry.name}.`,
          tags: [
            "official",
            "pursue",
            bundle.releaseTag,
            "bundle",
            bundle.type,
            "zip-entry"
          ]
        });
      }
    } catch (error) {
      console.warn(
        `Official bundle fallback unavailable for ${bundle.url}. ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return discoveries;
}

async function loadOfficialBundles() {
  try {
    const registry = await readJson<OfficialBundleRegistry>("data/official-bundles.json");
    return registry.bundles.filter((bundle) => {
      const typeIsValid = ["document", "image", "video", "audio", "unknown"].includes(bundle.type);
      const modeIsValid = bundle.mode === "aggregate" || bundle.mode === "zip-entries";
      const urlIsOfficial = isApprovedOfficialFallbackUrl(bundle.url);
      if (!typeIsValid || !modeIsValid || !urlIsOfficial) {
        console.warn(`Skipping invalid official bundle registry entry: ${bundle.id}`);
        return false;
      }
      return true;
    });
  } catch (error) {
    console.warn(
      `Official bundle registry unavailable. ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return [];
  }
}

function isApprovedOfficialFallbackUrl(url: string) {
  return isValidatedHttpsUrl(url, BUNDLE_HOSTS);
}

export function parseCsv(csvText: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let insideQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === "\"" && insideQuotes && nextChar === "\"") {
      cell += "\"";
      index += 1;
    } else if (char === "\"") {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (cell || row.length) {
        row.push(cell.trim());
        rows.push(row);
        row = [];
        cell = "";
      }
      if (char === "\r" && nextChar === "\n") index += 1;
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }

  if (insideQuotes) throw new Error("Official CSV contains an unterminated quoted field");

  return rows;
}

function normalizeCsvHeader(value: string) {
  return value.replace(/^\uFEFF/, "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function buildReleaseTagMap(releaseDates: string[]) {
  const dates = [...new Set(releaseDates)].sort();
  return new Map(
    dates.map((date, index) => [date, `release-${String(index + 1).padStart(2, "0")}`])
  );
}

export function assertCumulativeSnapshot(
  previousCases: CaseRecord[],
  discoveries: Array<{
    releaseDate: string | null;
    title?: string;
    mediaUrl?: string | null;
  }>
) {
  if (!previousCases.length) return;
  if (discoveries.length < previousCases.length) {
    throw new Error(
      `Official cumulative CSV regressed from ${previousCases.length} to ${discoveries.length} records; preserving existing data`
    );
  }

  const countByDate = (records: Array<{ releaseDate: string | null }>) => {
    const counts = new Map<string, number>();
    for (const record of records) {
      if (!record.releaseDate) continue;
      counts.set(record.releaseDate, (counts.get(record.releaseDate) ?? 0) + 1);
    }
    return counts;
  };
  const previousCounts = countByDate(previousCases);
  const nextCounts = countByDate(discoveries);
  for (const [date, previousCount] of previousCounts) {
    const nextCount = nextCounts.get(date) ?? 0;
    if (nextCount < previousCount) {
      throw new Error(
        `Official cumulative CSV regressed release ${date} from ${previousCount} to ${nextCount} records; preserving existing data`
      );
    }
  }

  const authoritativeCases = previousCases.filter((record) => record.tags.includes("csv"));
  const previousIdentityCounts = countStableIdentities(authoritativeCases);
  const nextIdentityCounts = countStableIdentities(discoveries);
  for (const prior of authoritativeCases) {
    const stableIdentityRemains = stableIdentityKeys(prior).some(
      (key) => previousIdentityCounts.get(key) === 1 && nextIdentityCounts.get(key) === 1
    );
    if (!stableIdentityRemains) {
      throw new Error(
        `Official cumulative CSV no longer contains a unique identity for ${prior.id}; preserving existing data`
      );
    }
  }
}

type StableIdentityRecord = {
  releaseDate: string | null;
  title?: string;
  mediaUrl?: string | null;
};

function countStableIdentities(records: StableIdentityRecord[]) {
  const counts = new Map<string, number>();
  for (const record of records) {
    for (const key of stableIdentityKeys(record)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

function stableIdentityKeys(record: StableIdentityRecord) {
  if (!record.releaseDate) return [];
  const keys: string[] = [];
  if (record.title) {
    const identifier = officialRecordKey({ title: record.title, releaseDate: record.releaseDate });
    if (identifier) keys.push(`code:${identifier}`);
  }
  if (record.mediaUrl) {
    try {
      const mediaUrl = validatedHttpsUrl(record.mediaUrl, IDENTITY_MEDIA_HOSTS);
      keys.push(`media:${record.releaseDate}:${mediaUrl.toString()}`);
    } catch {
      // An invalid media URL cannot serve as an authoritative stable identity.
    }
  }
  return keys;
}

function isSaneReleaseDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) {
    return false;
  }
  const earliestPursueRelease = Date.parse("2026-05-08T00:00:00Z");
  const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
  return timestamp >= earliestPursueRelease && timestamp <= tomorrow;
}

function valueAt(row: string[], index: number) {
  return index >= 0 ? row[index]?.trim() ?? "" : "";
}

function mediaTypeFromCsv(value: string): MediaType {
  switch (value.trim().toUpperCase()) {
    case "PDF":
      return "document";
    case "IMG":
      return "image";
    case "VID":
      return "video";
    case "AUD":
      return "audio";
    default:
      return "unknown";
  }
}

function toOfficialAssetUrl(value: string) {
  if (!value) return null;
  const absoluteUrl = toAbsoluteUrl(value);
  return absoluteUrl && isApprovedOfficialFallbackUrl(absoluteUrl) ? absoluteUrl : null;
}

function parseDvidsIds(value: string) {
  return [...new Set(value.split("|").map((id) => id.trim()).filter((id) => /^\d+$/.test(id)))];
}

function dvidsEmbedUrl(id: string | undefined, type: MediaType) {
  if (!id) return null;
  if (type === "audio") return `https://www.dvidshub.net/audio/embed/${id}`;
  if (type === "video") return `https://www.dvidshub.net/video/embed/${id}`;
  return null;
}

function warRecordUrl(title: string, releaseTag: string) {
  const releaseNumber = releaseTag.match(/\d+$/)?.[0] ?? "01";
  const releaseLabel = `Release+${releaseNumber.padStart(2, "0")}`;
  return `https://www.war.gov/UFO/${titleToHash(title)}/?releaseDate=${releaseLabel}`;
}

function titleToHash(title: string) {
  return title
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9\-_]/g, "")
    .replace(/-+/g, "-");
}

function normalizeLocation(value: string) {
  if (!value || value === "N/A") return "Unknown location";
  return value;
}

function dedupeDiscoveries(discoveries: Discovery[]) {
  const map = new Map<string, Discovery>();
  for (const discovery of discoveries) {
    map.set(discovery.id ?? discovery.mediaUrl ?? discovery.sourceUrl, discovery);
  }
  return [...map.values()];
}

async function listRemoteZipEntries(url: string) {
  const head = await safeFetch(url, { allowedHosts: BUNDLE_HOSTS, method: "HEAD" });
  if (!head.ok) throw new Error(`Failed to inspect ${url}: ${head.status}`);
  const contentLength = Number(head.headers.get("content-length"));
  if (
    !Number.isSafeInteger(contentLength) ||
    contentLength <= 0 ||
    contentLength > MAX_ZIP_BYTES
  ) {
    throw new Error(`Invalid or excessive content-length for ${url}`);
  }

  const tailLength = Math.min(contentLength, MAX_ZIP_TAIL_BYTES);
  const requestedStart = contentLength - tailLength;
  const requestedEnd = contentLength - 1;
  const response = await safeFetch(url, {
    allowedHosts: BUNDLE_HOSTS,
    headers: { range: `bytes=${requestedStart}-${requestedEnd}` }
  });
  if (response.status !== 206) {
    throw new Error(`Failed to read ZIP directory for ${url}: ${response.status}`);
  }
  const contentRange = parseContentRange(response.headers.get("content-range"));
  if (
    !contentRange ||
    contentRange.start !== requestedStart ||
    contentRange.end !== requestedEnd ||
    contentRange.total !== contentLength
  ) {
    throw new Error(`Invalid Content-Range for ${url}`);
  }

  const tail = Buffer.from(await readBytesBounded(response, tailLength));
  if (tail.length !== tailLength) throw new Error(`Incomplete ZIP tail response for ${url}`);
  return parseZipDirectoryTail(tail, requestedStart, url);
}

export function parseZipDirectoryTail(tail: Buffer, tailStart: number, url = "ZIP") {
  const eocdOffset = findSignatureReverse(tail, 0x06054b50);
  if (eocdOffset < 0) throw new Error(`ZIP end-of-central-directory not found for ${url}`);
  assertBufferRange(tail, eocdOffset, 22, `ZIP end-of-central-directory for ${url}`);

  let entryCount = tail.readUInt16LE(eocdOffset + 10);
  let centralDirectorySize = tail.readUInt32LE(eocdOffset + 12);
  let centralDirectoryOffset = tail.readUInt32LE(eocdOffset + 16);

  if (
    entryCount === 0xffff ||
    centralDirectorySize === 0xffffffff ||
    centralDirectoryOffset === 0xffffffff
  ) {
    const locatorOffset = findSignatureReverse(tail.subarray(0, eocdOffset), 0x07064b50);
    if (locatorOffset < 0) throw new Error(`ZIP64 locator not found for ${url}`);
    assertBufferRange(tail, locatorOffset, 20, `ZIP64 locator for ${url}`);
    const zip64Offset = safeZipNumber(tail.readBigUInt64LE(locatorOffset + 8), "ZIP64 offset", url);
    const zip64TailOffset = zip64Offset - tailStart;
    assertBufferRange(tail, zip64TailOffset, 56, `ZIP64 directory for ${url}`);
    if (tail.readUInt32LE(zip64TailOffset) !== 0x06064b50) {
      throw new Error(`ZIP64 end-of-central-directory not found for ${url}`);
    }
    entryCount = safeZipNumber(tail.readBigUInt64LE(zip64TailOffset + 32), "entry count", url);
    centralDirectorySize = safeZipNumber(
      tail.readBigUInt64LE(zip64TailOffset + 40),
      "central-directory size",
      url
    );
    centralDirectoryOffset = safeZipNumber(
      tail.readBigUInt64LE(zip64TailOffset + 48),
      "central-directory offset",
      url
    );
  }

  if (!Number.isSafeInteger(entryCount) || entryCount < 0 || entryCount > MAX_ZIP_ENTRIES) {
    throw new Error(`ZIP entry count is invalid or excessive for ${url}`);
  }
  if (
    !Number.isSafeInteger(centralDirectorySize) ||
    centralDirectorySize < 0 ||
    centralDirectorySize > MAX_CENTRAL_DIRECTORY_BYTES ||
    !Number.isSafeInteger(centralDirectoryOffset) ||
    centralDirectoryOffset < 0
  ) {
    throw new Error(`ZIP central-directory range is invalid or excessive for ${url}`);
  }

  const directoryTailOffset = centralDirectoryOffset - tailStart;
  if (
    directoryTailOffset < 0 ||
    centralDirectorySize > tail.length - directoryTailOffset
  ) {
    throw new Error(`Central directory is outside fetched range for ${url}`);
  }

  const entries: Array<{ name: string; compressedSize: number; uncompressedSize: number }> = [];
  let offset = directoryTailOffset;
  for (let index = 0; index < entryCount; index += 1) {
    assertBufferRange(tail, offset, 46, `central directory entry ${index} for ${url}`);
    if (tail.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`Invalid central directory entry ${index} for ${url}`);
    }
    const compressedSize = tail.readUInt32LE(offset + 20);
    const uncompressedSize = tail.readUInt32LE(offset + 24);
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) {
      throw new Error(`ZIP64 entry sizes are unsupported for entry ${index} in ${url}`);
    }
    const fileNameLength = tail.readUInt16LE(offset + 28);
    const extraLength = tail.readUInt16LE(offset + 30);
    const commentLength = tail.readUInt16LE(offset + 32);
    const entryLength = 46 + fileNameLength + extraLength + commentLength;
    assertBufferRange(tail, offset, entryLength, `central directory entry ${index} for ${url}`);
    if (offset + entryLength > directoryTailOffset + centralDirectorySize) {
      throw new Error(`Central directory entry ${index} exceeds declared size for ${url}`);
    }
    const name = tail
      .subarray(offset + 46, offset + 46 + fileNameLength)
      .toString("utf8");
    entries.push({ name, compressedSize, uncompressedSize });
    offset += entryLength;
  }

  return entries;
}

export function parseContentRange(value: string | null) {
  const match = value?.match(/^bytes (\d+)-(\d+)\/(\d+)$/i);
  if (!match) return null;
  const [start, end, total] = match.slice(1).map(Number);
  if (
    ![start, end, total].every(Number.isSafeInteger) ||
    start < 0 ||
    end < start ||
    total <= end
  ) {
    return null;
  }
  return { start, end, total };
}

function assertBufferRange(buffer: Buffer, offset: number, length: number, label: string) {
  if (
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(length) ||
    offset < 0 ||
    length < 0 ||
    offset > buffer.length ||
    length > buffer.length - offset
  ) {
    throw new Error(`${label} is outside the fetched ZIP tail`);
  }
}

function safeZipNumber(value: bigint, label: string, url: string) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${label} exceeds safe numeric range for ${url}`);
  }
  return Number(value);
}

function findSignatureReverse(buffer: Buffer, signature: number) {
  for (let index = buffer.length - 4; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === signature) return index;
  }
  return -1;
}

export function normalizeReleaseDate(value: string | null | undefined) {
  return normalizeDateWithTwoDigitYear(value, (suffix) => 2000 + suffix);
}

export function normalizeIncidentDate(
  value: string | null | undefined,
  now = new Date()
) {
  const currentTwoDigitYear = now.getUTCFullYear() % 100;
  return normalizeDateWithTwoDigitYear(
    value,
    (suffix) => (suffix <= currentTwoDigitYear ? 2000 : 1900) + suffix
  );
}

function normalizeDateWithTwoDigitYear(
  value: string | null | undefined,
  resolveTwoDigitYear: (suffix: number) => number
) {
  if (!value || value === "N/A") return null;
  const iso = findIsoDate(value);
  if (iso) return iso;
  const bareYear = value.match(/^(19|20)\d{2}$/);
  if (bareYear) return `${bareYear[0]}-01-01`;
  const yearRange = value.match(/^((?:19|20)\d{2})\s*-\s*((?:19|20)?\d{2})$/);
  if (yearRange) return `${yearRange[1]}-01-01`;
  const compact = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!compact) return null;
  const year =
    compact[3].length === 2
      ? resolveTwoDigitYear(Number(compact[3]))
      : Number(compact[3]);
  const month = compact[1].padStart(2, "0");
  const day = compact[2].padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function coordinatesForLocation(locationName: string | undefined) {
  const location = (locationName ?? "").toLowerCase();
  const matches: Array<[RegExp, { latitude: number; longitude: number }]> = [
    [/iraq/, { latitude: 33.2232, longitude: 43.6793 }],
    [/(arabian|persian) gulf/, { latitude: 26.75, longitude: 52.0 }],
    [/mediterranean sea/, { latitude: 35.0, longitude: 18.0 }],
    [/aegean sea/, { latitude: 38.5, longitude: 25.0 }],
    [/gulf of oman/, { latitude: 24.8, longitude: 58.2 }],
    [/gulf of aden/, { latitude: 12.4, longitude: 48.0 }],
    [/strait of hormuz/, { latitude: 26.5667, longitude: 56.25 }],
    [/arabian sea/, { latitude: 15.0, longitude: 65.0 }],
    [/united arab emirates|uae/, { latitude: 23.4241, longitude: 53.8478 }],
    [/east china sea/, { latitude: 28.0, longitude: 125.0 }],
    [/yellow sea/, { latitude: 36.0, longitude: 124.0 }],
    [/japan/, { latitude: 36.2048, longitude: 138.2529 }],
    [/djibouti/, { latitude: 11.8251, longitude: 42.5903 }],
    [/syria/, { latitude: 34.8021, longitude: 38.9968 }],
    [/greece/, { latitude: 39.0742, longitude: 21.8243 }],
    [/germany/, { latitude: 51.1657, longitude: 10.4515 }],
    [/netherlands/, { latitude: 52.1326, longitude: 5.2913 }],
    [/azerbaijan/, { latitude: 40.1431, longitude: 47.5769 }],
    [/georgia/, { latitude: 42.3154, longitude: 43.3569 }],
    [/turkmenistan/, { latitude: 38.9697, longitude: 59.5563 }],
    [/kazakhstan/, { latitude: 48.0196, longitude: 66.9237 }],
    [/iran/, { latitude: 32.4279, longitude: 53.688 }],
    [/papua new guinea/, { latitude: -6.315, longitude: 143.9555 }],
    [/new mexico/, { latitude: 34.5199, longitude: -105.8701 }],
    [/mexico/, { latitude: 23.6345, longitude: -102.5528 }],
    [/texas/, { latitude: 31.9686, longitude: -99.9018 }],
    [/detroit/, { latitude: 42.3314, longitude: -83.0458 }],
    [/midwestern united states/, { latitude: 41.8781, longitude: -93.0977 }],
    [/north atlantic ocean/, { latitude: 35.0, longitude: -40.0 }],
    [/pacific time zone|western north america/, { latitude: 37.0, longitude: -120.0 }],
    [/pacific ocean/, { latitude: 0, longitude: -160.0 }],
    [/united states/, { latitude: 39.8283, longitude: -98.5795 }],
    [/northcom/, { latitude: 39.0, longitude: -98.0 }],
    [/centcom/, { latitude: 29.0, longitude: 45.0 }],
    [/africom/, { latitude: 9.1021, longitude: 18.2812 }],
    [/eucom/, { latitude: 50.0, longitude: 10.0 }],
    [/indo-pacom|indo pacom|indopacom/, { latitude: 15.0, longitude: 145.0 }],
    [/middle east/, { latitude: 29.2985, longitude: 42.551 }],
    [/africa|african airspace/, { latitude: 9.1021, longitude: 18.2812 }],
    [/southern united states/, { latitude: 32.1656, longitude: -82.9001 }],
    [/western united states/, { latitude: 39.0, longitude: -113.5 }],
    [/southeastern united states/, { latitude: 33.0, longitude: -84.0 }],
    [/north america/, { latitude: 45.0, longitude: -100.0 }],
    [/cislunar space|low earth orbit/, { latitude: 0, longitude: 0 }],
    [/ussr|soviet union/, { latitude: 55.0, longitude: 37.0 }],
    [/moon|apollo/, { latitude: 0.6741, longitude: 23.4731 }]
  ];
  return matches.find(([pattern]) => pattern.test(location))?.[1] ?? null;
}

function inferType(url: string, text: string): MediaType {
  const value = `${url} ${text}`.toLowerCase();
  if (/\.(pdf|docx?|xlsx?|pptx?|txt|csv)(\?|$)/.test(value)) return "document";
  if (/\.(png|jpe?g|gif|webp|tiff?)(\?|$)/.test(value)) return "image";
  if (/\.(mp4|mov|m4v|webm|avi)(\?|$)/.test(value)) return "video";
  if (/\.(mp3|wav|m4a|aac|flac|ogg)(\?|$)/.test(value)) return "audio";
  if (/video/.test(value)) return "video";
  if (/audio/.test(value)) return "audio";
  if (/image|photo|still/.test(value)) return "image";
  if (/document|file|pdf/.test(value)) return "document";
  return "unknown";
}

function inferAgency(text: string) {
  if (/aaro/i.test(text)) return "AARO";
  if (/department of war|war\.gov/i.test(text)) return "Department of War";
  if (/dod|department of defense/i.test(text)) return "Department of Defense";
  return "Unknown agency";
}

function isPotentialOfficialAsset(url: string) {
  try {
    const parsed = new URL(url);
    if (!isValidatedHttpsUrl(url, WAR_HOSTS)) return false;
    if (/\/ufo\/?$/i.test(parsed.pathname)) return true;
    return /\.(pdf|docx?|xlsx?|pptx?|txt|csv|png|jpe?g|gif|webp|tiff?|mp4|mov|m4v|webm|avi)$/i.test(
      parsed.pathname
    );
  } catch {
    return false;
  }
}

function findIsoDate(text: string) {
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];
  const named = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(20\d{2})\b/i
  );
  if (!named) return null;
  const date = new Date(`${named[1]} ${named[2]}, ${named[3]} UTC`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function toAbsoluteUrl(rawUrl: string) {
  try {
    return new URL(rawUrl, SOURCE_URL).toString();
  } catch {
    return null;
  }
}

function cleanTitle(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\b(download|view|open|file)\b/gi, "")
    .trim()
    .slice(0, 140);
}

function titleFromUrl(url: string) {
  const name = path.basename(url.includes("://") ? new URL(url).pathname : url);
  return cleanTitle(decodeURIComponent(name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ")));
}

function stableId(discovery: Discovery) {
  if (discovery.id) return discovery.id;
  const base = discovery.mediaUrl ?? `${discovery.title}-${discovery.sourceUrl}`;
  return `pursue-${slug(base).slice(0, 72)}`;
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mergeTags(left: string[], right: string[]) {
  return [...new Set([...left, ...right].filter(Boolean))].sort();
}

async function readJson<T>(relativePath: string): Promise<T> {
  const raw = await readFile(path.join(root, relativePath), "utf8");
  return JSON.parse(raw) as T;
}

async function writeJson(relativePath: string, value: unknown) {
  await writeFile(
    path.join(root, relativePath),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8"
  );
}

function errorMessage(error: unknown) {
  return (error instanceof Error ? error.message : String(error))
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .trim()
    .slice(0, 500);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
