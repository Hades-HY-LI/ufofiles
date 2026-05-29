import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ExternalLink, GitBranch, LocateFixed } from "lucide-react";
import { CaseCard } from "@/components/CaseCard";
import { CaseMetadata } from "@/components/CaseMetadata";
import { JsonLd } from "@/components/JsonLd";
import { MediaViewer } from "@/components/MediaViewer";
import { TagBadge } from "@/components/TagBadge";
import { getCaseById, getCases, getRelatedCases } from "@/lib/cases";
import { getOfficialSourceHref } from "@/lib/source-links";
import { buildBreadcrumbJsonLd, buildCaseJsonLd, createCaseMetadata } from "@/lib/seo";

type CasePageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export async function generateStaticParams() {
  return getCases().map((caseRecord) => ({ id: caseRecord.id }));
}

export async function generateMetadata({
  params
}: CasePageProps): Promise<Metadata> {
  const { id } = await params;
  const caseRecord = getCaseById(id);
  return createCaseMetadata(caseRecord);
}

export default async function CasePage({ params, searchParams }: CasePageProps) {
  const { id } = await params;
  const query = await searchParams;
  const caseRecord = getCaseById(id);
  if (!caseRecord) notFound();
  const related = getRelatedCases(caseRecord);
  const sourceHref = getOfficialSourceHref(caseRecord);
  const backHref = safeExploreHref(query?.from) ?? "/explore";
  const canMap =
    caseRecord.latitude !== null && caseRecord.longitude !== null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <JsonLd
        data={[
          buildCaseJsonLd(caseRecord),
          buildBreadcrumbJsonLd([
            { name: "UFO Files Archive", path: "/" },
            { name: "Explore", path: "/explore" },
            { name: caseRecord.title, path: `/case/${caseRecord.id}` }
          ])
        ]}
      />
      <Link
        href={backHref}
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
              href={sourceHref}
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
            ) : (
              <Link
                href="/map"
                className="inline-flex items-center gap-2 rounded-md border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100 transition hover:bg-amber-300/20"
              >
                Listed as unmapped <LocateFixed size={16} />
              </Link>
            )}
            <Link
              href="/graph"
              className="inline-flex items-center gap-2 rounded-md border border-fuchsia-300/30 bg-fuchsia-300/10 px-4 py-3 text-sm font-bold text-fuchsia-100 transition hover:bg-fuchsia-300/20"
            >
              View graph <GitBranch size={16} />
            </Link>
            <Link
              href="/timeline"
              className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-slate-100 transition hover:bg-white/10"
            >
              Timeline <CalendarDays size={16} />
            </Link>
          </div>
          {caseRecord.tags.includes("bundle") ? (
            <div className="mt-6 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-50">
              This record was derived from an official release bundle. The
              archive preserves the official bundle URL and ZIP entry metadata
              without republishing large government media files.
            </div>
          ) : null}
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

function safeExploreHref(from: string | undefined) {
  if (!from) return null;
  if (!from.startsWith("/explore")) return null;
  if (from.startsWith("//")) return null;
  return from;
}
