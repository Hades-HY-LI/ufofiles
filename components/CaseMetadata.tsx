import type { CaseRecord } from "@/lib/types";
import { formatDate } from "@/lib/dates";
import { labelMediaType } from "@/lib/filters";

type CaseMetadataProps = {
  caseRecord: CaseRecord;
};

export function CaseMetadata({ caseRecord }: CaseMetadataProps) {
  const rows = [
    ["Agency", caseRecord.agency],
    ["Incident date", formatDate(caseRecord.incidentDate)],
    ["Release date", formatDate(caseRecord.releaseDate)],
    ["Location", caseRecord.locationName],
    ["Media type", labelMediaType(caseRecord.type)],
    ["Coordinates", coordinates(caseRecord)],
    ["Confidence", caseRecord.confidence]
  ];

  return (
    <dl className="divide-y divide-white/10 rounded-lg border border-white/10 bg-slate-950/60">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 p-4 sm:grid-cols-[9rem_1fr]">
          <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </dt>
          <dd className="text-sm text-slate-200">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function coordinates(caseRecord: CaseRecord) {
  if (caseRecord.latitude === null || caseRecord.longitude === null) {
    return "Unknown";
  }
  return `${caseRecord.latitude.toFixed(4)}, ${caseRecord.longitude.toFixed(4)}`;
}
