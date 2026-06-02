import type { Metadata } from "next";
import type { CaseRecord, SyncMetadata } from "@/lib/types";
import { formatDate } from "@/lib/dates";
import { labelMediaType } from "@/lib/filters";
import {
  getOfficialMediaHref,
  getOfficialSourceHref,
  publicOfficialMediaUrl
} from "@/lib/source-links";

export const siteConfig = {
  name: "UFO Files Archive",
  url: "https://ufofiles.info",
  description:
    "A static-first archive for browsing official UFO/UAP releases with source links, sync status, search, timeline, map, and case pages.",
  officialSourceUrl: "https://www.war.gov/ufo/"
};

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}

export function createPageMetadata({
  title,
  description,
  path
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: {
      canonical: url
    },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      type: "website"
    },
    twitter: {
      card: "summary",
      title,
      description
    }
  };
}

export function createCaseMetadata(caseRecord: CaseRecord | null): Metadata {
  if (!caseRecord) {
    return createPageMetadata({
      title: "Case",
      description: "Official-source UFO/UAP archive case record.",
      path: "/explore"
    });
  }

  const description = truncateDescription(
    [
      `Official ${caseRecord.agency} ${labelMediaType(caseRecord.type).toLowerCase()} record.`,
      caseRecord.releaseDate ? `Released ${formatDate(caseRecord.releaseDate)}.` : null,
      caseRecord.locationName ? `Location: ${caseRecord.locationName}.` : null,
      caseRecord.summary
    ]
      .filter(Boolean)
      .join(" ")
  );
  const url = absoluteUrl(`/case/${caseRecord.id}`);

  return {
    title: caseRecord.title,
    description,
    alternates: {
      canonical: url
    },
    openGraph: {
      title: caseRecord.title,
      description,
      url,
      siteName: siteConfig.name,
      type: "article",
      publishedTime: caseRecord.releaseDate ?? undefined,
      tags: caseRecord.tags
    },
    twitter: {
      card: "summary",
      title: caseRecord.title,
      description
    }
  };
}

export function buildDatasetJsonLd(syncMetadata: SyncMetadata) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${siteConfig.url}/#dataset`,
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    inLanguage: "en",
    isAccessibleForFree: true,
    isBasedOn: siteConfig.officialSourceUrl,
    sameAs: siteConfig.officialSourceUrl,
    license: {
      "@type": "CreativeWork",
      name: "UFO Files Archive license and attribution",
      url: absoluteUrl("/about#license-and-attribution")
    },
    dateModified: syncMetadata.lastSyncedAt,
    keywords: ["UFO", "UAP", "official records", "government records", "archive"],
    distribution: [
      dataDownload("Case records JSON", "/data/cases.json"),
      dataDownload("Release records JSON", "/data/releases.json"),
      dataDownload("Sync metadata JSON", "/data/sync-metadata.json"),
      dataDownload("Combined archive JSON", "/data/archive.json")
    ],
    creator: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url
    }
  };
}

export function buildCaseJsonLd(caseRecord: CaseRecord) {
  const pageUrl = absoluteUrl(`/case/${caseRecord.id}`);
  const sourceHref = getOfficialSourceHref(caseRecord);
  const mediaHref = getOfficialMediaHref(caseRecord);
  const contentLocation =
    caseRecord.locationName || caseRecord.latitude !== null || caseRecord.longitude !== null
      ? {
          "@type": "Place",
          name: caseRecord.locationName,
          geo:
            caseRecord.latitude !== null && caseRecord.longitude !== null
              ? {
                  "@type": "GeoCoordinates",
                  latitude: caseRecord.latitude,
                  longitude: caseRecord.longitude
                }
              : undefined
        }
      : undefined;

  return stripUndefined({
    "@context": "https://schema.org",
    "@type": schemaTypeForCase(caseRecord),
    "@id": `${pageUrl}#record`,
    name: caseRecord.title,
    description: caseRecord.summary,
    url: pageUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageUrl
    },
    sameAs: sourceHref,
    isBasedOn: stripUndefined({
      "@type": "CreativeWork",
      name: "Official source record",
      url: sourceHref,
      associatedMedia: mediaHref ? mediaObjectForCase(caseRecord, mediaHref) : undefined
    }),
    contentUrl:
      mediaHref && caseRecord.type !== "video" && caseRecord.type !== "audio"
        ? mediaHref
        : undefined,
    embedUrl:
      caseRecord.mediaUrl && /dvidshub\.net\/(video|audio)\/embed\//i.test(caseRecord.mediaUrl)
        ? caseRecord.mediaUrl
        : undefined,
    encodingFormat: mediaHref ? encodingFormatForCase(caseRecord, mediaHref) : undefined,
    datePublished: caseRecord.releaseDate ?? undefined,
    temporalCoverage: caseRecord.incidentDate ?? undefined,
    contentLocation,
    keywords: caseRecord.tags.join(", "),
    genre: labelMediaType(caseRecord.type),
    provider: {
      "@type": "Organization",
      name: caseRecord.agency
    },
    isPartOf: {
      "@id": `${siteConfig.url}/#dataset`
    },
    inLanguage: "en"
  });
}

export function buildItemListJsonLd({
  name,
  description,
  path,
  cases
}: {
  name: string;
  description: string;
  path: string;
  cases: CaseRecord[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    description,
    url: absoluteUrl(path),
    numberOfItems: cases.length,
    itemListElement: cases.map((caseRecord, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/case/${caseRecord.id}`),
      name: caseRecord.title
    }))
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

function dataDownload(name: string, path: string) {
  return {
    "@type": "DataDownload",
    name,
    encodingFormat: "application/json",
    contentUrl: absoluteUrl(path)
  };
}

function schemaTypeForCase(caseRecord: CaseRecord) {
  if (caseRecord.type === "image") return "ImageObject";
  if (caseRecord.type === "video") return "VideoObject";
  if (caseRecord.type === "audio") return "AudioObject";
  if (caseRecord.type === "document") return "DigitalDocument";
  return "CreativeWork";
}

function mediaObjectForCase(caseRecord: CaseRecord, mediaHref: string) {
  const base = {
    "@type": schemaTypeForCase(caseRecord),
    name: caseRecord.title,
    description: caseRecord.summary,
    encodingFormat: encodingFormatForCase(caseRecord, mediaHref)
  };

  if (/dvidshub\.net\/(video|audio)\/embed\//i.test(caseRecord.mediaUrl ?? "")) {
    return stripUndefined({
      ...base,
      embedUrl: caseRecord.mediaUrl,
      contentUrl: publicOfficialMediaUrl(caseRecord.mediaUrl ?? mediaHref)
    });
  }

  return stripUndefined({
    ...base,
    contentUrl: mediaHref
  });
}

function encodingFormatForCase(caseRecord: CaseRecord, mediaHref: string) {
  if (caseRecord.type === "document") return "application/pdf";
  if (caseRecord.type === "video") return "video";
  if (caseRecord.type === "audio") return "audio";
  if (caseRecord.type === "image") return imageEncodingFormat(mediaHref);
  return undefined;
}

function imageEncodingFormat(mediaHref: string) {
  if (/\.png(?:$|[?#])/i.test(mediaHref)) return "image/png";
  if (/\.gif(?:$|[?#])/i.test(mediaHref)) return "image/gif";
  if (/\.webp(?:$|[?#])/i.test(mediaHref)) return "image/webp";
  return "image/jpeg";
}

function truncateDescription(text: string, maxLength = 300) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, entry]) =>
        entry === undefined ? [] : [[key, stripUndefined(entry)]]
      )
    ) as T;
  }
  return value;
}
