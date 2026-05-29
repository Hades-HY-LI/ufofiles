import type { CaseRecord } from "@/lib/types";

export function getOfficialSourceHref(caseRecord: CaseRecord) {
  return getWarGovCardHref(caseRecord) ?? caseRecord.sourceUrl;
}

export function getOfficialMediaHref(caseRecord: CaseRecord) {
  if (!caseRecord.mediaUrl) return null;
  return publicOfficialMediaUrl(caseRecord.mediaUrl);
}

export function getWarGovCardHref(caseRecord: CaseRecord) {
  const releaseLabel = releaseLabelForCase(caseRecord);
  const typeFilter = warGovTypeFilter[caseRecord.type];
  const hash = titleToHash(caseRecord.title);
  const params: string[] = [];

  if (releaseLabel) params.push(`releaseDate=${releaseLabel}`);
  if (typeFilter) params.push(`type=${typeFilter}`);

  const query = params.join("&");
  return `https://www.war.gov/ufo/${query ? `?${query}` : ""}#${hash}`;
}

export function publicOfficialMediaUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "www.dvidshub.net") {
      const match = parsed.pathname.match(/^\/(video|audio)\/embed\/([^/?#]+)/);
      if (match) return `https://www.dvidshub.net/${match[1]}/${match[2]}`;
    }
  } catch {
    return url;
  }

  return url;
}

const warGovTypeFilter: Record<CaseRecord["type"], string | null> = {
  document: ".pdf",
  image: ".img",
  video: ".vid",
  audio: ".aud",
  unknown: null
};

function releaseLabelForCase(caseRecord: CaseRecord) {
  const releaseTag = caseRecord.tags.find((tag) => /^release-\d+$/i.test(tag));
  if (releaseTag) {
    const releaseNumber = releaseTag.split("-")[1]?.padStart(2, "0");
    if (releaseNumber) return `Release+${releaseNumber}`;
  }
  if (caseRecord.releaseDate === "2026-05-22") return "Release+02";
  if (caseRecord.releaseDate === "2026-05-08") return "Release+01";
  return null;
}

export function titleToHash(title: string) {
  return title
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9\-_]/g, "")
    .replace(/-+/g, "-");
}
