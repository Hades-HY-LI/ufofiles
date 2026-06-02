import casesJson from "@/data/cases.json";
import manifestJson from "@/data/war-ufo-manifest.json";
import { publicOfficialMediaUrl } from "@/lib/source-links";
import type { CaseRecord } from "@/lib/types";

type ManifestRecord = {
  id?: string;
  title: string;
  sourceUrl?: string;
  mediaUrl?: string | null;
};

type Lookup = {
  aliases: Map<string, string>;
  canonicalIds: Set<string>;
};

const caseRecords = casesJson as CaseRecord[];
const manifestRecords = (manifestJson as { records?: ManifestRecord[] }).records ?? [];
const lookup = buildAliasLookup();

export function getCanonicalCaseIdForAlias(id: string) {
  if (lookup.canonicalIds.has(id)) return null;
  return lookup.aliases.get(id) ?? null;
}

function buildAliasLookup(): Lookup {
  const canonicalIds = new Set(caseRecords.map((caseRecord) => caseRecord.id));
  const bySignal = new Map<string, string | null>();
  const aliases = new Map<string, string>();

  for (const caseRecord of caseRecords) {
    for (const signal of signalsForCase(caseRecord)) {
      addUniqueSignal(bySignal, signal, caseRecord.id);
    }
  }

  for (const record of manifestRecords) {
    if (!record.id || canonicalIds.has(record.id)) continue;

    const canonicalId = signalsForManifestRecord(record)
      .map((signal) => bySignal.get(signal))
      .find((match): match is string => Boolean(match));

    if (canonicalId) aliases.set(record.id, canonicalId);
  }

  return { aliases, canonicalIds };
}

function signalsForCase(caseRecord: CaseRecord) {
  return [
    titleSignal(caseRecord.title),
    ...urlSignals(caseRecord.sourceUrl),
    ...urlSignals(caseRecord.mediaUrl)
  ].filter(isString);
}

function signalsForManifestRecord(record: ManifestRecord) {
  return [
    titleSignal(record.title),
    ...urlSignals(record.sourceUrl),
    ...urlSignals(record.mediaUrl)
  ].filter(isString);
}

function addUniqueSignal(map: Map<string, string | null>, signal: string, id: string) {
  if (!map.has(signal)) {
    map.set(signal, id);
    return;
  }

  const existing = map.get(signal);
  if (existing !== id) map.set(signal, null);
}

function urlSignals(url: string | null | undefined) {
  if (!url) return [];
  const publicUrl = publicOfficialMediaUrl(url);
  return [
    normalizedUrlSignal(url),
    normalizedUrlSignal(publicUrl),
    dvidsSignal(url),
    dvidsSignal(publicUrl)
  ].filter((signal): signal is string => Boolean(signal));
}

function normalizedUrlSignal(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.pathname = parsed.pathname.replace(/\/+$/, "").toLowerCase();
    return `url:${parsed.toString()}`;
  } catch {
    return null;
  }
}

function dvidsSignal(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "www.dvidshub.net") return null;
    const match = parsed.pathname.match(/^\/(video|audio)(?:\/embed)?\/([^/?#]+)/i);
    return match ? `dvids:${match[1].toLowerCase()}:${match[2]}` : null;
  } catch {
    return null;
  }
}

function titleSignal(title: string) {
  const normalized = title
    .toLowerCase()
    .replace(/\bpr0*(\d+)\b/g, "pr$1")
    .replace(/\bd0*(\d+)\b/g, "d$1")
    .replace(/\bvm0*(\d+)\b/g, "vm$1")
    .replace(/\bcable-0*(\d+)\b/g, "cable-$1")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return normalized ? `title:${normalized}` : null;
}

function isString(value: string | null): value is string {
  return Boolean(value);
}
