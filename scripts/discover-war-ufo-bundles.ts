import * as cheerio from "cheerio";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MediaType } from "../lib/types";

const SOURCE_URL = "https://www.war.gov/ufo/";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

type DiscoveryPage = {
  url: string;
  kind?: "portal" | "release" | "release-search";
};

type DiscoveryPages = {
  notes?: string;
  pages: DiscoveryPage[];
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
  sourcePageUrl?: string;
};

type OfficialBundleRegistry = {
  notes?: string;
  bundles: OfficialBundle[];
};

type PageSnapshot = {
  url: string;
  html: string;
  text: string;
  title: string;
};

const defaultPages: DiscoveryPage[] = [
  { url: SOURCE_URL, kind: "portal" },
  { url: "https://www.war.gov/News/Releases/Search/uap/", kind: "release-search" },
  {
    url: "https://www.war.gov/News/Releases/Release/Article/4480582/department-of-war-releases-unidentified-anomalous-phenomena-files-in-historic-t/",
    kind: "release"
  },
  {
    url: "https://www.war.gov/News/Releases/Release/Article/4499305/department-of-war-publishes-second-release-of-unidentified-anomalous-phenomena/",
    kind: "release"
  }
];

async function main() {
  const registry = await readRegistry();
  const configuredPages = await readDiscoveryPages();
  const pageQueue = new Map<string, DiscoveryPage>();

  for (const page of [...defaultPages, ...configuredPages]) {
    pageQueue.set(normalizeUrl(page.url), page);
  }

  const snapshots: PageSnapshot[] = [];
  const failures: string[] = [];

  for (const page of pageQueue.values()) {
    try {
      const snapshot = await fetchPage(page.url);
      snapshots.push(snapshot);

      if (page.kind === "release-search") {
        for (const releaseUrl of discoverReleasePages(snapshot)) {
          pageQueue.set(releaseUrl, { url: releaseUrl, kind: "release" });
        }
      }
    } catch (error) {
      failures.push(
        `${page.url}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  const discoveredBundles = snapshots.flatMap((snapshot) =>
    discoverBundles(snapshot)
  );
  const mergedBundles = mergeBundles(registry.bundles, discoveredBundles);
  const nextRegistry: OfficialBundleRegistry = {
    notes:
      registry.notes ??
      "Official release bundles linked from war.gov/ufo or official war.gov release pages. The sync script reads this registry when war.gov/ufo blocks live fetches.",
    bundles: mergedBundles
  };

  await writeJson("data/official-bundles.json", nextRegistry);

  const addedCount = mergedBundles.length - registry.bundles.length;
  console.log(
    `Discovered ${discoveredBundles.length} official bundle candidates from ${snapshots.length} pages; registry has ${mergedBundles.length} bundle(s), ${Math.max(addedCount, 0)} added.`
  );

  if (failures.length) {
    console.warn(
      `Some official discovery pages were unreachable:\n${failures
        .map((failure) => `- ${failure}`)
        .join("\n")}`
    );
  }
}

async function fetchPage(url: string): Promise<PageSnapshot> {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent":
        "UFO Files Archive non-commercial official-source discovery (+https://ufofiles.info/)"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const title = cleanTitle($("h1").first().text() || $("title").text());
  return { url, html, text, title };
}

function discoverReleasePages(snapshot: PageSnapshot) {
  const $ = cheerio.load(snapshot.html);
  const urls = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    const absoluteUrl = normalizeUrl(href, snapshot.url);
    if (!absoluteUrl) return;
    if (!/\/News\/Releases\/Release\/Article\//i.test(new URL(absoluteUrl).pathname)) {
      return;
    }

    const text = `${$(element).text()} ${$(element).closest("article, li, div").text()}`;
    if (!/(ufo|uap|unidentified anomalous|aerial phenomena|pursue)/i.test(text)) {
      return;
    }
    urls.add(absoluteUrl);
  });

  return [...urls];
}

function discoverBundles(snapshot: PageSnapshot) {
  const $ = cheerio.load(snapshot.html);
  const bundles = new Map<string, OfficialBundle>();
  const releaseDate = findIsoDate(snapshot.text) ?? inferReleaseDate(snapshot);
  const releaseTag = inferReleaseTag(snapshot.title, snapshot.text, releaseDate);

  $("a[href], source[src]").each((_, element) => {
    const rawUrl = $(element).attr("href") ?? $(element).attr("src");
    if (!rawUrl) return;

    const url = normalizeUrl(rawUrl, snapshot.url);
    if (!url || !isApprovedOfficialFallbackUrl(url)) return;
    if (!/\.zip(\?|$)/i.test(new URL(url).pathname)) return;

    const linkText = cleanTitle(
      $(element).text() ||
        $(element).attr("title") ||
        $(element).attr("aria-label") ||
        titleFromUrl(url)
    );
    const type = inferType(url, linkText);
    const bundleType = type === "unknown" ? inferTypeFromUrlPath(url) : type;
    const title = linkText || `PURSUE ${releaseTagLabel(releaseTag)} ${bundleType} bundle`;
    const id = `${releaseTag}-${bundleType}-bundle`;

    bundles.set(url, {
      id,
      title,
      url,
      releaseDate,
      releaseTag,
      type: bundleType,
      mode: shouldReadZipEntries(url, bundleType) ? "zip-entries" : "aggregate",
      agency: "Department of War",
      summary: `Official PURSUE ${releaseTagLabel(
        releaseTag
      )} ${bundleType} bundle discovered from an official War.gov page.`,
      sourcePageUrl: snapshot.url
    });
  });

  return [...bundles.values()];
}

function mergeBundles(existing: OfficialBundle[], discovered: OfficialBundle[]) {
  const byUrl = new Map<string, OfficialBundle>();

  for (const bundle of existing) {
    if (!isApprovedOfficialFallbackUrl(bundle.url)) continue;
    byUrl.set(bundle.url, normalizeBundle(bundle));
  }

  for (const bundle of discovered) {
    const previous = byUrl.get(bundle.url);
    byUrl.set(bundle.url, {
      ...bundle,
      ...previous,
      sourcePageUrl: previous?.sourcePageUrl ?? bundle.sourcePageUrl
    });
  }

  return [...byUrl.values()].sort((a, b) => {
    const dateCompare = a.releaseDate.localeCompare(b.releaseDate);
    if (dateCompare) return dateCompare;
    return a.id.localeCompare(b.id);
  });
}

function normalizeBundle(bundle: OfficialBundle): OfficialBundle {
  return {
    ...bundle,
    releaseTag: bundle.releaseTag || inferReleaseTag(bundle.title, bundle.summary, bundle.releaseDate),
    type: bundle.type || inferType(bundle.url, bundle.title),
    mode: bundle.mode || "aggregate",
    agency: bundle.agency || "Department of War"
  };
}

function shouldReadZipEntries(url: string, type: MediaType) {
  const hostname = new URL(url).hostname.toLowerCase();
  return hostname === "d34w7g4gy10iej.cloudfront.net" || type === "video";
}

function inferType(url: string, text: string): MediaType {
  const value = `${url} ${text}`.toLowerCase();
  if (/\b(video|mp4|mov|m4v|webm|avi)\b/.test(value)) return "video";
  if (/\b(audio|mp3|wav|m4a|aac|flac|ogg)\b/.test(value)) return "audio";
  if (/\b(image|photo|still|png|jpe?g|gif|webp|tiff?)\b/.test(value)) {
    return "image";
  }
  if (/\b(document|pdf|docx?|xlsx?|pptx?|txt|csv)\b/.test(value)) return "document";
  return "unknown";
}

function inferTypeFromUrlPath(url: string): MediaType {
  const pathName = new URL(url).pathname.toLowerCase();
  if (/video|uap\d{6}/.test(pathName)) return "video";
  if (/audio/.test(pathName)) return "audio";
  if (/image|photo|still/.test(pathName)) return "image";
  if (/document|release_\d+_document/.test(pathName)) return "document";
  return "unknown";
}

function inferReleaseDate(snapshot: PageSnapshot) {
  if (/052226|may 22, 2026/i.test(snapshot.html)) return "2026-05-22";
  if (/050826|may 8, 2026/i.test(snapshot.html)) return "2026-05-08";
  return new Date().toISOString().slice(0, 10);
}

function inferReleaseTag(title: string, text: string, releaseDate: string) {
  const value = `${title} ${text}`.toLowerCase();
  const numberMap: Array<[RegExp, string]> = [
    [/\b(first|initial|release 0?1)\b/, "release-01"],
    [/\b(second|release 0?2)\b/, "release-02"],
    [/\b(third|release 0?3)\b/, "release-03"],
    [/\b(fourth|release 0?4)\b/, "release-04"],
    [/\b(fifth|release 0?5)\b/, "release-05"]
  ];
  const match = numberMap.find(([pattern]) => pattern.test(value));
  if (match) return match[1];
  if (releaseDate === "2026-05-22") return "release-02";
  if (releaseDate === "2026-05-08") return "release-01";
  return `release-${releaseDate.replaceAll("-", "").slice(2)}`;
}

function releaseTagLabel(releaseTag: string) {
  const number = releaseTag.match(/\d+/)?.[0] ?? "";
  return number ? `Release ${number.padStart(2, "0")}` : releaseTag;
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

function cleanTitle(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 140);
}

function titleFromUrl(url: string) {
  const name = path.basename(new URL(url).pathname);
  return cleanTitle(decodeURIComponent(name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ")));
}

function normalizeUrl(rawUrl: string, baseUrl = SOURCE_URL) {
  try {
    const url = new URL(rawUrl, baseUrl);
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

async function readDiscoveryPages() {
  try {
    const config = await readJson<DiscoveryPages>("data/official-release-pages.json");
    return config.pages.filter((page) => page.url);
  } catch {
    return [];
  }
}

async function readRegistry() {
  try {
    return await readJson<OfficialBundleRegistry>("data/official-bundles.json");
  } catch {
    return {
      notes:
        "Official release bundles linked from war.gov/ufo or official war.gov release pages. The sync script reads this registry when war.gov/ufo blocks live fetches.",
      bundles: []
    };
  }
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
