import Link from "next/link";
import { ArrowRight, Clock3, Database, Map } from "lucide-react";
import { CaseCard } from "@/components/CaseCard";
import type { CaseRecord, SyncMetadata } from "@/lib/types";

type HeroProps = {
  featuredCases: CaseRecord[];
  totalCases: number;
  syncMetadata: SyncMetadata;
};

export function Hero({ featuredCases, totalCases, syncMetadata }: HeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-teal-50 via-white to-white">
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-800 shadow-sm">
              <Database size={16} /> Official-source fan archive
            </div>
            <h1 className="mt-6 max-w-4xl font-[var(--font-space)] text-4xl font-semibold leading-tight text-slate-950 sm:text-6xl">
              Explore official UFO/UAP records with context.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              A fan-built, non-commercial archive for browsing, searching, and
              connecting government-released UAP records through cases,
              timeline, and map views.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                Explore Cases <ArrowRight size={17} />
              </Link>
              <Link
                href="/timeline"
                className="inline-flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
              >
                View Timeline <Clock3 size={17} />
              </Link>
              <Link
                href="/map"
                className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                View Map <Map size={17} />
              </Link>
            </div>
            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
              <Stat label="Records" value={String(totalCases)} />
              <Stat label="New sync" value={String(syncMetadata.newRecordCount)} />
              <Stat label="Changed" value={String(syncMetadata.changedRecordCount)} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-lg backdrop-blur">
            <div className="mb-3 flex items-center justify-between px-2 text-sm text-slate-500">
              <span>Latest archive records</span>
              <span className="font-semibold text-teal-700">Synced monitor</span>
            </div>
            <div className="grid gap-3">
              {featuredCases.slice(0, 2).map((caseRecord) => (
                <CaseCard key={caseRecord.id} caseRecord={caseRecord} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="font-[var(--font-space)] text-2xl font-semibold text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
    </div>
  );
}
