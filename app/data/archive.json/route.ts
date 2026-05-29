import { getCases, getReleases, getSyncMetadata } from "@/lib/cases";
import { siteConfig } from "@/lib/seo";

export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      name: siteConfig.name,
      url: siteConfig.url,
      sourceUrl: siteConfig.officialSourceUrl,
      syncMetadata: getSyncMetadata(),
      releases: getReleases(),
      cases: getCases()
    },
    {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=3600"
      }
    }
  );
}
