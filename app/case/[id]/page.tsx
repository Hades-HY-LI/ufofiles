import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, LocateFixed } from "lucide-react";
import { CaseCard } from "@/components/CaseCard";
import { CaseMetadata } from "@/components/CaseMetadata";
import { MediaViewer } from "@/components/MediaViewer";
import { TagBadge } from "@/components/TagBadge";
import { getCaseById, getCases, getRelatedCases } from "@/lib/cases";

type CasePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  return getCases().map((caseRecord) => ({ id: caseRecord.id }));
}

export async function generateMetadata({
  params
}: CasePageProps): Promise<Metadata> {
  const { id } = await params;
  const caseRecord = getCaseById(id);
  return {
    title: caseRecord?.title ?? "Case"
  };
}

export default async function CasePage({ params }: CasePageProps) {
  const { id } = await params;
  const caseRecord = getCaseById(id);
  if (!caseRecord) notFound();
  const related = getRelatedCases(caseRecord);
  const canMap =
    caseRecord.latitude !== null && caseRecord.longitude !== null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/explore"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white"
      >
        <ArrowLeft size={16} /> Back to Explore
      </Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_0.88fr]">
        <section>
          <div className="flex flex-wrap gap-2">
            <TagBadge tone="cyan">{caseRecord.agency}</TagBadge>
            <TagBadge tone="violet">{caseRecord.type}</TagBadge>
          </div>
          <h1 className="mt-5 font-[var(--font-space)] text-4xl font-semibold leading-tight text-white sm:text-5xl">
            {caseRecord.title}
          </h1>
          <p className="mt-5 text-base leading-8 text-slate-300">
            {caseRecord.summary}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {caseRecord.tags.map((tag) => (
              <TagBadge key={tag}>{tag}</TagBadge>
            ))}
          </div>
          <div className="mt-8">
            <CaseMetadata caseRecord={caseRecord} />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={caseRecord.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
            >
              Open official source <ExternalLink size={16} />
            </a>
            {canMap ? (
              <Link
                href={`/map?case=${caseRecord.id}`}
                className="inline-flex items-center gap-2 rounded-md border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100 transition hover:bg-emerald-300/20"
              >
                Show on the map <LocateFixed size={16} />
              </Link>
            ) : null}
          </div>
        </section>
        <aside>
          <MediaViewer caseRecord={caseRecord} />
        </aside>
      </div>
      <section className="mt-14">
        <h2 className="font-[var(--font-space)] text-2xl font-semibold text-white">
          Related cases
        </h2>
        {related.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {related.map((item) => (
              <CaseCard key={item.id} caseRecord={item} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-400">
            Related records will appear as the official-source archive grows.
          </p>
        )}
      </section>
    </main>
  );
}
