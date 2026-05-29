import Link from "next/link";
import { CalendarDays, ExternalLink, LocateFixed, MapPin } from "lucide-react";
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
    <article className="group flex h-full flex-col rounded-lg border border-white/10 bg-slate-950/60 p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-slate-900/82">
      <div className="flex items-start justify-between gap-3">
        <TagBadge tone={caseRecord.type === "unknown" ? "slate" : "cyan"}>
          {labelMediaType(caseRecord.type)}
        </TagBadge>
        <span className="rounded-md border border-violet-300/25 bg-violet-300/10 px-2 py-1 text-xs text-violet-100">
          {caseRecord.agency}
        </span>
      </div>
      <h3 className="mt-4 line-clamp-2 font-[var(--font-space)] text-lg font-semibold leading-6 text-white">
        <Link href={caseHref}>{caseRecord.title}</Link>
      </h3>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">
        {caseRecord.summary}
      </p>
      <div className="mt-4 space-y-2 text-sm text-slate-300">
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-cyan-200" />
          <span>Incident: {formatDate(caseRecord.incidentDate)}</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-violet-200" />
          <span>Released: {formatDate(caseRecord.releaseDate)}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={15} className="text-emerald-200" />
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
          className="rounded-md bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
        >
          View case
        </Link>
        {canMap ? (
          <Link
            href={`/map?case=${caseRecord.id}`}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/20"
          >
            <LocateFixed size={14} /> Show on map
          </Link>
        ) : null}
        <a
          href={sourceHref}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-sm text-slate-400 transition hover:text-white"
        >
          Source <ExternalLink size={14} />
        </a>
      </div>
    </article>
  );
}
