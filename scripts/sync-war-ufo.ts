import * as cheerio from "cheerio";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CaseRecord, MediaType, ReleaseRecord, SyncMetadata } from "../lib/types";

const SOURCE_URL = "https://www.war.gov/ufo/";
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
  mediaUrl: string;
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

async function main() {
  const [previousCases, previousReleases] = await Promise.all([
    readJson<CaseRecord[]>("data/cases.json"),
    readJson<ReleaseRecord[]>("data/releases.json")
  ]);

  let discoveries: Discovery[];
  let status: SyncMetadata["status"] = "fresh";
  try {
    const html = await fetchSource();
    discoveries = discoverRecords(html);
  } catch (error) {
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
          error instanceof Error ? error.message : String(error)
        }`
      );
      return;
    }
    console.warn(
      `Live source unavailable; using manifest fallback with ${discoveries.length} official URLs. ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  const mergedCases = mergeCases(previousCases, discoveries);
  const releases = buildReleases(previousReleases, discoveries, mergedCases);
  const metadata = buildMetadata(previousCases, mergedCases, status);

  await Promise.all([
    writeJson("data/cases.json", mergedCases),
    writeJson("data/releases.json", releases),
    writeJson("data/sync-metadata.json", metadata)
  ]);

  console.log(
    `Synced ${mergedCases.length} records from ${SOURCE_URL}: ${metadata.newRecordCount} new, ${metadata.changedRecordCount} changed, status ${metadata.status}.`
  );
}

async function fetchSource() {
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
    const coordinates = coordinatesForLocation(discovery.locationName);
    merged.set(id, {
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
        (discovery.type === "document" ? discovery.sourceUrl : null) ??
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
    });
  }

  return [...merged.values()].sort((a, b) =>
    (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "")
  );
}

function buildReleases(
  previousReleases: ReleaseRecord[],
  discoveries: Discovery[],
  cases: CaseRecord[]
) {
  const releaseDate = discoveries[0]?.releaseDate ?? "2026-05-08";
  const release: ReleaseRecord = {
    id: "pursue-release-01",
    title: "PURSUE Release 01",
    releaseDate,
    sourceUrl: SOURCE_URL,
    fileCount: discoveries.length,
    notes: "Automated sync record for official files detected on the PURSUE portal."
  };

  const map = new Map(previousReleases.map((item) => [item.id, item]));
  map.set(release.id, { ...map.get(release.id), ...release });
  return [...map.values()];
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
  try {
    const manifest = await readJson<WarUfoManifest>("data/war-ufo-manifest.json");
    return manifest.records.map((record) => ({
      id: record.id,
      title: record.title,
      sourceUrl: record.sourceUrl ?? manifest.sourceUrl ?? SOURCE_URL,
      mediaUrl: record.mediaUrl,
      releaseDate: normalizeDate(record.releaseDate) ?? "2026-05-08",
      incidentDate: normalizeDate(record.incidentDate),
      locationName: record.locationName ?? "Unknown location",
      latitude: record.latitude ?? null,
      longitude: record.longitude ?? null,
      agency: record.agency ?? inferAgency(`${record.title} ${record.mediaUrl}`),
      type: record.type ?? inferType(record.mediaUrl, record.title),
      summary:
        record.summary ??
        `Official UAP-related ${record.type ?? inferType(record.mediaUrl, record.title)} from the PURSUE release portal manifest fallback.`,
      tags: record.tags ?? ["manifest-fallback"]
    }));
  } catch {
    return [];
  }
}

function normalizeDate(value: string | null | undefined) {
  if (!value || value === "N/A") return null;
  const iso = findIsoDate(value);
  if (iso) return iso;
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
    [/detroit/, { latitude: 42.3314, longitude: -83.0458 }],
    [/pacific time zone|western north america/, { latitude: 37.0, longitude: -120.0 }],
    [/pacific ocean/, { latitude: 0, longitude: -160.0 }],
    [/united states/, { latitude: 39.8283, longitude: -98.5795 }],
    [/indo-pacom|indo pacom|indopacom/, { latitude: 15.0, longitude: 145.0 }],
    [/middle east/, { latitude: 29.2985, longitude: 42.551 }],
    [/africa|african airspace/, { latitude: 9.1021, longitude: 18.2812 }],
    [/southern united states/, { latitude: 32.1656, longitude: -82.9001 }],
    [/western united states/, { latitude: 39.0, longitude: -113.5 }],
    [/southeastern united states/, { latitude: 33.0, longitude: -84.0 }],
    [/north america/, { latitude: 45.0, longitude: -100.0 }],
    [/low earth orbit/, { latitude: 0, longitude: 0 }],
    [/moon|apollo/, { latitude: 0.6741, longitude: 23.4731 }]
  ];
  return matches.find(([pattern]) => pattern.test(location))?.[1] ?? null;
}

function inferType(url: string, text: string): MediaType {
  const value = `${url} ${text}`.toLowerCase();
  if (/\.(pdf|docx?|xlsx?|pptx?|txt|csv)(\?|$)/.test(value)) return "document";
  if (/\.(png|jpe?g|gif|webp|tiff?)(\?|$)/.test(value)) return "image";
  if (/\.(mp4|mov|m4v|webm|avi)(\?|$)/.test(value)) return "video";
  if (/video/.test(value)) return "video";
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
  const name = path.basename(new URL(url).pathname);
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
