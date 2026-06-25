import Link from "next/link";
import { CalendarDays, ExternalLink, LocateFixed, MapPin, ShieldCheck } from "lucide-react";
import type { CaseRecord } from "@/lib/types";
import { formatDate } from "@/lib/dates";
import { labelMediaType } from "@/lib/filters";
import { getOfficialSourceHref } from "@/lib/source-links";
import { TagBadge } from "@/components/TagBadge";

type CaseCardProps = {
  caseRecord: CaseRecord;
  caseHref?: string;
};

export function CaseCard({ caseRecord, caseHref = `/case/${caseRecord.id}` }: CaseCardProps) {
  const canMap =
    caseRecord.latitude !== null && caseRecord.longitude !== null;
  const sourceHref = getOfficialSourceHref(caseRecord);

  return (
    <article className="group flex h-full min-w-0 flex-col rounded-lg border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <TagBadge tone={caseRecord.type === "unknown" ? "slate" : "cyan"}>
          {labelMediaType(caseRecord.type)}
        </TagBadge>
        <span className="min-w-0 truncate rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-semibold text-neutral-700">
          {caseRecord.agency}
        </span>
      </div>
      <h3 className="mt-4 line-clamp-2 font-[var(--font-space)] text-lg font-semibold leading-6 text-slate-950">
        <Link href={caseHref}>{caseRecord.title}</Link>
      </h3>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
        {caseRecord.summary}
      </p>
      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-neutral-500" />
          <span>Incident: {formatDate(caseRecord.incidentDate)}</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-neutral-500" />
          <span>Released: {formatDate(caseRecord.releaseDate)}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={15} className="text-neutral-500" />
          <span className="line-clamp-1">{caseRecord.locationName}</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {caseRecord.tags.slice(0, 4).map((tag) => (
          <TagBadge key={tag}>{tag}</TagBadge>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
        <Link
          href={caseHref}
          className="rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          View case
        </Link>
        {canMap ? (
          <Link
            href={`/map?case=${caseRecord.id}`}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
          >
            <LocateFixed size={14} /> Show on map
          </Link>
        ) : null}
        <a
          href={sourceHref}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-neutral-600 transition hover:text-neutral-950"
        >
          <ShieldCheck size={14} /> Source <ExternalLink size={14} />
        </a>
      </div>
    </article>
  );
}
