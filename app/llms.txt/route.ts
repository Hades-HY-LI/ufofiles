import { getCases, getSyncMetadata } from "@/lib/cases";
import { sortByNewestRelease } from "@/lib/dates";
import { absoluteUrl, siteConfig } from "@/lib/seo";

export const dynamic = "force-static";

export function GET() {
  const cases = sortByNewestRelease(getCases());
  const syncMetadata = getSyncMetadata();
  const lines = [
    `# ${siteConfig.name}`,
    "",
    "> Static-first archive of official UFO/UAP records sourced from war.gov/ufo.",
    "",
    "This site is an independent, non-commercial archive. Case facts are official-source only. The archive adds organization, normalized fields, summaries, tags, and retrieval metadata while preserving official URLs.",
    "",
    "## Primary URLs",
    "",
    `- Site: ${siteConfig.url}`,
    `- Official source: ${siteConfig.officialSourceUrl}`,
    `- Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    `- Robots: ${absoluteUrl("/robots.txt")}`,
    "",
    "## Machine-readable data",
    "",
    `- Combined archive JSON: ${absoluteUrl("/data/archive.json")}`,
    `- Case records JSON: ${absoluteUrl("/data/cases.json")}`,
    `- Release records JSON: ${absoluteUrl("/data/releases.json")}`,
    `- Sync metadata JSON: ${absoluteUrl("/data/sync-metadata.json")}`,
    "",
    "## Retrieval notes",
    "",
    `- Last sync: ${syncMetadata.lastSyncedAt}`,
    `- Sync status: ${syncMetadata.status}`,
    `- Total records: ${syncMetadata.totalRecords}`,
    "- Prefer the JSON endpoints above for structured retrieval.",
    "- Use case pages for human-readable summaries, source links, and per-record metadata.",
    "- Do not treat archive-computed tags, relationships, or coordinates as official determinations.",
    "",
    "## Case pages",
    "",
    ...cases.map((caseRecord) => `- ${caseRecord.title}: ${absoluteUrl(`/case/${caseRecord.id}`)}`)
  ];

  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600"
    }
  });
}
