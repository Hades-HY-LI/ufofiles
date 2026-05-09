import type { MetadataRoute } from "next";
import { getCases } from "@/lib/cases";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://ufo-files-archive.vercel.app";
  const routes = ["", "/explore", "/timeline", "/map", "/about"].map(
    (route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date()
    })
  );

  return [
    ...routes,
    ...getCases().map((caseRecord) => ({
      url: `${baseUrl}/case/${caseRecord.id}`,
      lastModified: new Date(caseRecord.releaseDate ?? Date.now())
    }))
  ];
}
