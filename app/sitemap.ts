import type { MetadataRoute } from "next";
import { getCases, getSyncMetadata } from "@/lib/cases";
import { absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const syncMetadata = getSyncMetadata();
  const siteLastModified = new Date(syncMetadata.lastSyncedAt);
  const recentlyChanged = new Set([
    ...syncMetadata.latestNewCaseIds,
    ...syncMetadata.latestChangedCaseIds
  ]);
  const routes = ["", "/explore", "/releases", "/timeline", "/graph", "/map", "/about"].map(
    (route) => ({
      url: absoluteUrl(route || "/"),
      lastModified: siteLastModified,
      changeFrequency: route ? ("weekly" as const) : ("daily" as const),
      priority: route ? 0.7 : 1
    })
  );

  return [
    ...routes,
    ...getCases().map((caseRecord) => ({
      url: absoluteUrl(`/case/${caseRecord.id}`),
      lastModified: recentlyChanged.has(caseRecord.id)
        ? siteLastModified
        : new Date(caseRecord.releaseDate ?? syncMetadata.lastSyncedAt),
      changeFrequency: "monthly" as const,
      priority: recentlyChanged.has(caseRecord.id) ? 0.8 : 0.6
    }))
  ];
}
