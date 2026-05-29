import type { MetadataRoute } from "next";
import { getCases, getSyncMetadata } from "@/lib/cases";
import { absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const syncMetadata = getSyncMetadata();
  const siteLastModified = new Date(syncMetadata.lastSyncedAt);
  const routes = ["", "/explore", "/releases", "/timeline", "/graph", "/map", "/about"].map(
    (route) => ({
      url: absoluteUrl(route || "/"),
      lastModified: siteLastModified
    })
  );

  return [
    ...routes,
    ...getCases().map((caseRecord) => ({
      url: absoluteUrl(`/case/${caseRecord.id}`),
      lastModified: new Date(caseRecord.releaseDate ?? syncMetadata.lastSyncedAt)
    }))
  ];
}
