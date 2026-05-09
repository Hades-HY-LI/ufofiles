import casesJson from "@/data/cases.json";
import releasesJson from "@/data/releases.json";
import syncMetadataJson from "@/data/sync-metadata.json";
import {
  CaseRecord,
  CaseRecordSchema,
  ReleaseRecord,
  ReleaseRecordSchema,
  SyncMetadata,
  SyncMetadataSchema
} from "@/lib/types";
import { sortByNewestRelease } from "@/lib/dates";

export function getCases(): CaseRecord[] {
  return CaseRecordSchema.array().parse(casesJson);
}

export function getReleases(): ReleaseRecord[] {
  return ReleaseRecordSchema.array().parse(releasesJson);
}

export function getSyncMetadata(): SyncMetadata {
  return SyncMetadataSchema.parse(syncMetadataJson);
}

export function getCaseById(id: string) {
  return getCases().find((item) => item.id === id) ?? null;
}

export function getFeaturedCases(limit = 4) {
  return sortByNewestRelease(getCases()).slice(0, limit);
}

export function getRelatedCases(caseRecord: CaseRecord, limit = 3) {
  const tags = new Set(caseRecord.tags);
  return getCases()
    .filter((item) => item.id !== caseRecord.id)
    .map((item) => ({
      item,
      score:
        (item.agency === caseRecord.agency ? 2 : 0) +
        item.tags.filter((tag) => tags.has(tag)).length
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}

export function getFilterOptions(cases = getCases()) {
  return {
    agencies: [...new Set(cases.map((item) => item.agency))].sort(),
    years: [
      ...new Set(cases.map((item) => item.incidentDate?.slice(0, 4) ?? "Unknown"))
    ].sort((a, b) => (a === "Unknown" ? 1 : b === "Unknown" ? -1 : b.localeCompare(a))),
    types: [...new Set(cases.map((item) => item.type))].sort(),
    tags: [...new Set(cases.flatMap((item) => item.tags))].sort()
  };
}
