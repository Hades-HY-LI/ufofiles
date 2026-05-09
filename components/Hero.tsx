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
    <section className="relative overflow-hidden border-b border-white/10 bg-star-field">
      <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.22)_1px,transparent_0)] [background-size:34px_34px]" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
              <Database size={16} /> Official-source fan archive
            </div>
            <h1 className="mt-6 max-w-4xl font-[var(--font-space)] text-4xl font-semibold leading-tight text-white sm:text-6xl">
              Explore official UFO/UAP releases.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              A fan-built, non-commercial archive for browsing, searching, and
              connecting government-released UAP records through cases,
              timeline, and map views.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 rounded-md bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
              >
                Explore Cases <ArrowRight size={17} />
              </Link>
              <Link
                href="/timeline"
                className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-violet-300/40 hover:bg-violet-300/10"
              >
                View Timeline <Clock3 size={17} />
              </Link>
              <Link
                href="/map"
                className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-emerald-300/40 hover:bg-emerald-300/10"
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
          <div className="rounded-lg border border-white/10 bg-slate-950/55 p-3 shadow-panel backdrop-blur">
            <div className="mb-3 flex items-center justify-between px-2 text-sm text-slate-400">
              <span>Latest archive records</span>
              <span className="text-cyan-100">Synced monitor</span>
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
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="font-[var(--font-space)] text-2xl font-semibold text-white">
        {value}
      </div>
      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
    </div>
  );
}
