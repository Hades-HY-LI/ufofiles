import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft, CalendarDays, ExternalLink, GitBranch, LocateFixed } from "lucide-react";
import { CaseCard } from "@/components/CaseCard";
import { CaseMetadata } from "@/components/CaseMetadata";
import { JsonLd } from "@/components/JsonLd";
import { MediaViewer } from "@/components/MediaViewer";
import { TagBadge } from "@/components/TagBadge";
import { getCanonicalCaseIdForAlias } from "@/lib/case-aliases";
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
  const caseRecord = getCaseById(id) ?? getCaseByAlias(id);
  return createCaseMetadata(caseRecord);
}

export default async function CasePage({ params, searchParams }: CasePageProps) {
  const { id } = await params;
  const query = await searchParams;
  const canonicalId = getCanonicalCaseIdForAlias(id);
  if (canonicalId) permanentRedirect(`/case/${canonicalId}`);

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
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-950"
      >
        <ArrowLeft size={16} /> Back to Explore
      </Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_0.88fr]">
        <section>
          <div className="flex flex-wrap gap-2">
            <TagBadge tone="cyan">{caseRecord.agency}</TagBadge>
            <TagBadge tone="violet">{caseRecord.type}</TagBadge>
          </div>
          <h1 className="mt-5 font-[var(--font-space)] text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
            {caseRecord.title}
          </h1>
          <p className="mt-5 text-base leading-8 text-slate-700">
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
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Open official source <ExternalLink size={16} />
            </a>
            {canMap ? (
              <Link
                href={`/map?case=${caseRecord.id}`}
                className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
              >
                Show on the map <LocateFixed size={16} />
              </Link>
            ) : (
              <Link
                href="/map"
                className="inline-flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700 transition hover:bg-orange-100"
              >
                Listed as unmapped <LocateFixed size={16} />
              </Link>
            )}
            <Link
              href="/graph"
              className="inline-flex items-center gap-2 rounded-md border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-bold text-pink-700 transition hover:bg-pink-100"
            >
              View graph <GitBranch size={16} />
            </Link>
            <Link
              href="/timeline"
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Timeline <CalendarDays size={16} />
            </Link>
          </div>
          {caseRecord.tags.includes("bundle") ? (
            <div className="mt-6 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-teal-900">
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
        <h2 className="font-[var(--font-space)] text-2xl font-semibold text-slate-950">
          Related cases
        </h2>
        {related.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {related.map((item) => (
              <CaseCard key={item.id} caseRecord={item} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
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

function getCaseByAlias(id: string) {
  const canonicalId = getCanonicalCaseIdForAlias(id);
  return canonicalId ? getCaseById(canonicalId) : null;
}
