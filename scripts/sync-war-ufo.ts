import * as cheerio from "cheerio";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CaseRecord, MediaType, ReleaseRecord, SyncMetadata } from "../lib/types";

const SOURCE_URL = "https://www.war.gov/ufo/";
const CSV_URL = "https://www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv";
const FORCE_FALLBACK = process.env.WAR_UFO_FORCE_FALLBACK === "1";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

type Discovery = {
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
  try {
    const csv = await fetchOfficialCsv();
    discoveries = discoverCsvRecords(csv);
    console.log(`Read ${discoveries.length} official records from ${CSV_URL}.`);
  } catch (error) {
    console.warn(
      `Official CSV unavailable; trying live portal HTML. ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    try {
      const html = await fetchSource();
      discoveries = discoverRecords(html);
    } catch (portalError) {
      discoveries = await loadManifestDiscoveries();
      status = discoveries.length ? "partial" : "failed";
      if (!discoveries.length) {
        const metadata: SyncMetadata = {
          lastSyncedAt: new Date().toISOString(),
          sourceUrl: SOURCE_URL,
          totalRecords: previousCases.length,
          newRecordCount: 0,
          changedRecordCount: 0,
          latestNewCaseIds: [],
          latestChangedCaseIds: [],
          status
        };
        await writeJson("data/sync-metadata.json", metadata);
        console.warn(
          `Sync source unavailable; preserved ${previousCases.length} existing records. ${
            portalError instanceof Error ? portalError.message : String(portalError)
          }`
        );
        return;
      }
      console.warn(
        `Live source unavailable; using manifest fallback with ${discoveries.length} official URLs. ${
          portalError instanceof Error ? portalError.message : String(portalError)
        }`
      );
    }
  }
  const mergedCases =
    status === "partial"
      ? mergePartialFallbackCases(previousCases, discoveries)
      : mergeCases(previousCases, discoveries);
  const releases = buildReleases(previousReleases, mergedCases);
  const computedMetadata = buildMetadata(previousCases, mergedCases, status);
  let metadata = computedMetadata;
  let preservedMetadata = false;
  const releaseChanged = JSON.stringify(previousReleases) !== JSON.stringify(releases);

  if (
    !releaseChanged &&
    computedMetadata.newRecordCount === 0 &&
    computedMetadata.changedRecordCount === 0 &&
    (previousMetadata.status === status || status === "partial")
  ) {
    metadata = previousMetadata;
    preservedMetadata = true;
  }

  await Promise.all([
    writeJson("data/cases.json", mergedCases),
    writeJson("data/releases.json", releases),
    writeJson("data/sync-metadata.json", metadata)
  ]);

  console.log(
    `Synced ${mergedCases.length} records from ${SOURCE_URL}: ${computedMetadata.newRecordCount} new, ${computedMetadata.changedRecordCount} changed, status ${metadata.status}${
      preservedMetadata ? "; preserved previous metadata to avoid a timestamp-only commit" : ""
    }.`
  );

}

async function fetchOfficialCsv() {
  if (FORCE_FALLBACK) {
    throw new Error("WAR_UFO_FORCE_FALLBACK requested");
  }
  const response = await fetch(CSV_URL, {
    headers: {
      accept: "text/csv,application/octet-stream,text/plain"
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${CSV_URL}: ${response.status}`);
  }
  return response.text();
}

async function fetchSource() {
  if (FORCE_FALLBACK) {
    throw new Error("WAR_UFO_FORCE_FALLBACK requested");
  }
  const response = await fetch(SOURCE_URL, {
    headers: {
      "user-agent":
        "UFO Files Archive non-commercial fan archive sync (+https://www.war.gov/ufo/)"
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${response.status}`);
  }
  return response.text();
}

function discoverCsvRecords(csv: string): Discovery[] {
  const [header, ...rows] = parseCsv(csv);
  const column = (name: string) => header.indexOf(name);
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

  return rows
    .filter((row) => row.some(Boolean))
    .map((row) => {
      const title = cleanTitle(valueAt(row, index.title)) || "Official UAP record";
      const releaseDate = normalizeDate(valueAt(row, index.releaseDate)) ?? null;
      const type = mediaTypeFromCsv(valueAt(row, index.type));
      const assetUrl = valueAt(row, index.assetUrl);
      const imageUrl = valueAt(row, index.imageUrl);
      const dvidsId = valueAt(row, index.dvidsId);
      const releaseTag = releaseTagFromDate(releaseDate);
      const sourceUrl = warRecordUrl(title, releaseDate);
      const mediaUrl =
        toOfficialAssetUrl(assetUrl) ??
        toOfficialAssetUrl(imageUrl) ??
        dvidsEmbedUrl(dvidsId, type);
      const locationName = normalizeLocation(valueAt(row, index.location));

      return {
        id: `pursue-${releaseTag}-${slug(title).slice(0, 86)}`,
        title,
        sourceUrl,
        mediaUrl,
        releaseDate,
        incidentDate: normalizeDate(valueAt(row, index.incidentDate)),
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
          dvidsId ? "dvids" : "",
          valueAt(row, index.virin) ? "virin" : ""
        ].filter(Boolean)
      };
    });
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

function mergeCases(previousCases: CaseRecord[], discoveries: Discovery[]) {
  const previousById = new Map(previousCases.map((item) => [item.id, item]));
  const merged = new Map<string, CaseRecord>();

  for (const discovery of discoveries) {
    const id = stableId(discovery);
    const previous = previousById.get(id);
    merged.set(id, caseFromDiscovery(discovery, previous));
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

function caseFromDiscovery(discovery: Discovery, previous?: CaseRecord): CaseRecord {
  const id = stableId(discovery);
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

function sortCases(cases: CaseRecord[]) {
  return cases.sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
}

function buildReleases(previousReleases: ReleaseRecord[], cases: CaseRecord[]) {
  const map = new Map(previousReleases.map((item) => [item.id, item]));
  const grouped = new Map<string, CaseRecord[]>();
  for (const caseRecord of cases) {
    const releaseTag =
      caseRecord.tags.find((tag) => /^release-\d+$/i.test(tag)) ??
      releaseTagFromDate(caseRecord.releaseDate);
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
    map.set(release.id, { ...map.get(release.id), ...release });
  }

  return [...map.values()];
}

function releaseTagFromDate(releaseDate: string | null | undefined) {
  if (releaseDate === "2026-05-22") return "release-02";
  return "release-01";
}

function buildMetadata(
  previousCases: CaseRecord[],
  nextCases: CaseRecord[],
  status: SyncMetadata["status"]
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
    lastSyncedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    totalRecords: nextCases.length,
    newRecordCount: latestNewCaseIds.length,
    changedRecordCount: latestChangedCaseIds.length,
    latestNewCaseIds,
    latestChangedCaseIds,
    status
  };
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
      releaseDate: normalizeDate(record.releaseDate) ?? "2026-05-08",
      incidentDate: normalizeDate(record.incidentDate),
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
  try {
    const parsed = new URL(url);
    return (
      /(^|\.)war\.gov$/i.test(parsed.hostname) ||
      parsed.hostname === "d34w7g4gy10iej.cloudfront.net"
    );
  } catch {
    return false;
  }
}

function parseCsv(csvText: string) {
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

  return rows;
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

function dvidsEmbedUrl(id: string, type: MediaType) {
  if (!id) return null;
  if (type === "audio") return `https://www.dvidshub.net/audio/embed/${id}`;
  if (type === "video") return `https://www.dvidshub.net/video/embed/${id}`;
  return null;
}

function warRecordUrl(title: string, releaseDate: string | null) {
  const releaseLabel = releaseDate === "2026-05-22" ? "Release+02" : "Release+01";
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
  const head = await fetch(url, { method: "HEAD" });
  if (!head.ok) throw new Error(`Failed to inspect ${url}: ${head.status}`);
  const contentLength = Number(head.headers.get("content-length"));
  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    throw new Error(`Missing content-length for ${url}`);
  }

  const tailLength = Math.min(contentLength, 1024 * 1024);
  const response = await fetch(url, {
    headers: { range: `bytes=${contentLength - tailLength}-${contentLength - 1}` }
  });
  if (!response.ok && response.status !== 206) {
    throw new Error(`Failed to read ZIP directory for ${url}: ${response.status}`);
  }

  const tail = Buffer.from(await response.arrayBuffer());
  const tailStart = contentLength - tail.length;
  const eocdOffset = findSignatureReverse(tail, 0x06054b50);
  if (eocdOffset < 0) throw new Error(`ZIP end-of-central-directory not found for ${url}`);

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
    const zip64Offset = Number(tail.readBigUInt64LE(locatorOffset + 8));
    const zip64TailOffset = zip64Offset - tailStart;
    if (zip64TailOffset < 0 || zip64TailOffset + 56 > tail.length) {
      throw new Error(`ZIP64 directory is outside fetched range for ${url}`);
    }
    if (tail.readUInt32LE(zip64TailOffset) !== 0x06064b50) {
      throw new Error(`ZIP64 end-of-central-directory not found for ${url}`);
    }
    entryCount = Number(tail.readBigUInt64LE(zip64TailOffset + 32));
    centralDirectorySize = Number(tail.readBigUInt64LE(zip64TailOffset + 40));
    centralDirectoryOffset = Number(tail.readBigUInt64LE(zip64TailOffset + 48));
  }

  const directoryTailOffset = centralDirectoryOffset - tailStart;
  if (
    directoryTailOffset < 0 ||
    directoryTailOffset + centralDirectorySize > tail.length
  ) {
    throw new Error(`Central directory is outside fetched range for ${url}`);
  }

  const entries: Array<{ name: string; compressedSize: number; uncompressedSize: number }> = [];
  let offset = directoryTailOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (tail.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`Invalid central directory entry ${index} for ${url}`);
    }
    const compressedSize = tail.readUInt32LE(offset + 20);
    const uncompressedSize = tail.readUInt32LE(offset + 24);
    const fileNameLength = tail.readUInt16LE(offset + 28);
    const extraLength = tail.readUInt16LE(offset + 30);
    const commentLength = tail.readUInt16LE(offset + 32);
    const name = tail
      .subarray(offset + 46, offset + 46 + fileNameLength)
      .toString("utf8");
    entries.push({ name, compressedSize, uncompressedSize });
    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function findSignatureReverse(buffer: Buffer, signature: number) {
  for (let index = buffer.length - 4; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === signature) return index;
  }
  return -1;
}

function normalizeDate(value: string | null | undefined) {
  if (!value || value === "N/A") return null;
  const iso = findIsoDate(value);
  if (iso) return iso;
  const bareYear = value.match(/^(19|20)\d{2}$/);
  if (bareYear) return `${bareYear[0]}-01-01`;
  const yearRange = value.match(/^((?:19|20)\d{2})\s*-\s*((?:19|20)?\d{2})$/);
  if (yearRange) return `${yearRange[1]}-01-01`;
  const compact = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!compact) return null;
  let year =
    compact[3].length === 2 ? Number(`20${compact[3]}`) : Number(compact[3]);
  if (year > 2026 && compact[3].length === 2) year -= 100;
  const month = compact[1].padStart(2, "0");
  const day = compact[2].padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function coordinatesForLocation(locationName: string | undefined) {
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
    [/mexico/, { latitude: 23.6345, longitude: -102.5528 }],
    [/new mexico/, { latitude: 34.5199, longitude: -105.8701 }],
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
    if (!/(^|\.)war\.gov$/i.test(parsed.hostname)) return false;
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
