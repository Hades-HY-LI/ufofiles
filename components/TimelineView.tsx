import Link from "next/link";
import { CalendarDays, RadioTower } from "lucide-react";
import type { CaseRecord } from "@/lib/types";
import { formatDate } from "@/lib/dates";
import { TagBadge } from "@/components/TagBadge";

type TimelineViewProps = {
  cases: CaseRecord[];
};

export function TimelineView({ cases }: TimelineViewProps) {
  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="absolute left-4 top-0 h-full w-px bg-gradient-to-b from-cyan-300/60 via-slate-600 to-transparent md:left-1/2" />
      <div className="space-y-5">
        {cases.map((caseRecord, index) => (
          <article
            key={caseRecord.id}
            className={`relative md:grid md:grid-cols-2 md:gap-10 ${
              index % 2 ? "md:[&>div]:col-start-2" : ""
            }`}
          >
            <span className="absolute left-0 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-cyan-300/40 bg-slate-950 text-cyan-100 md:left-[calc(50%-1rem)]">
              <RadioTower size={15} />
            </span>
            <div className="ml-12 rounded-lg border border-white/10 bg-slate-950/70 p-5 shadow-panel transition hover:border-cyan-300/35 md:ml-0">
              <div className="flex flex-wrap items-center gap-2">
                <TagBadge tone="cyan">
                  Incident {formatDate(caseRecord.incidentDate)}
                </TagBadge>
                <TagBadge tone="violet">
                  Release {formatDate(caseRecord.releaseDate)}
                </TagBadge>
              </div>
              <h2 className="mt-4 font-[var(--font-space)] text-xl font-semibold text-white">
                <Link href={`/case/${caseRecord.id}`}>{caseRecord.title}</Link>
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {caseRecord.summary}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
                <span>{caseRecord.agency}</span>
                <span className="text-slate-600">/</span>
                <span>{caseRecord.locationName}</span>
              </div>
              <Link
                href={`/case/${caseRecord.id}`}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-100 hover:text-white"
              >
                Open case <CalendarDays size={15} />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
