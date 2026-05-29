import type { CaseRecord, MediaType } from "@/lib/types";

export function labelMediaType(type: MediaType) {
  const labels: Record<MediaType, string> = {
    document: "Document",
    image: "Image",
    video: "Video",
    audio: "Audio",
    unknown: "Unknown"
  };
  return labels[type];
}

export function hasCoordinates(caseRecord: CaseRecord) {
  return caseRecord.latitude !== null && caseRecord.longitude !== null;
}
