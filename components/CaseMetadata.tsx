import type { ReactNode } from "react";
import type { CaseRecord } from "@/lib/types";
import { formatDate } from "@/lib/dates";
import { labelMediaType } from "@/lib/filters";
import { getOfficialMediaHref, getOfficialSourceHref } from "@/lib/source-links";

type CaseMetadataProps = {
  caseRecord: CaseRecord;
};

export function CaseMetadata({ caseRecord }: CaseMetadataProps) {
  const sourceHref = getOfficialSourceHref(caseRecord);
  const mediaHref = getOfficialMediaHref(caseRecord);
  const rows: Array<[string, ReactNode]> = [
    ["Agency", caseRecord.agency],
    ["Incident date", formatDate(caseRecord.incidentDate)],
    ["Release date", formatDate(caseRecord.releaseDate)],
    ["Location", caseRecord.locationName],
    ["Media type", labelMediaType(caseRecord.type)],
    ["Coordinates", coordinates(caseRecord)],
    ["Confidence", caseRecord.confidence],
    ["Official source", <MetadataLink key="source" href={sourceHref} />],
    ...(mediaHref ? [[
      "Official media",
      <MetadataLink key="media" href={mediaHref} />
    ] satisfies [string, ReactNode]] : [])
  ];

  return (
    <dl className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 p-4 sm:grid-cols-[9rem_1fr]">
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {label}
          </dt>
          <dd className="text-sm text-slate-700">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function MetadataLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="break-words font-semibold text-teal-700 underline decoration-teal-300/70 underline-offset-4 hover:text-teal-950"
    >
      {displayUrl(href)}
    </a>
  );
}

function displayUrl(href: string) {
  try {
    const parsed = new URL(href);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return href;
  }
}

function coordinates(caseRecord: CaseRecord) {
  if (caseRecord.latitude === null || caseRecord.longitude === null) {
    return "Unknown";
  }
  return `${caseRecord.latitude.toFixed(4)}, ${caseRecord.longitude.toFixed(4)}`;
}
