import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, FileStack, GitCompareArrows } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { getCases, getReleases, getSyncMetadata } from "@/lib/cases";
import { formatDate } from "@/lib/dates";
import { labelMediaType } from "@/lib/filters";
import { buildItemListJsonLd, createPageMetadata } from "@/lib/seo";
import type { CaseRecord, MediaType } from "@/lib/types";

export const metadata: Metadata = createPageMetadata({
  title: "Releases",
  description:
    "Track official UFO/UAP release waves, sync changes, file counts, source links, and bundle-derived records.",
  path: "/releases"
});

export default function ReleasesPage() {
  const cases = getCases();
  const releases = [...getReleases()].sort((left, right) =>
    (right.releaseDate ?? "").localeCompare(left.releaseDate ?? "")
  );
  const metadata = getSyncMetadata();
  const latestNewCases = metadata.latestNewCaseIds
    .map((id) => cases.find((caseRecord) => caseRecord.id === id))
    .filter((caseRecord): caseRecord is CaseRecord => Boolean(caseRecord))
    .slice(0, 24);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <JsonLd
        data={buildItemListJsonLd({
          name: "Official UFO/UAP release records",
          description: "Release-linked case records available in the UFO Files Archive.",
          path: "/releases",
          cases
        })}
      />
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-700">
              Release tracker
            </p>
          <h1 className="mt-2 font-[var(--font-space)] text-4xl font-semibold text-slate-950">
            Official release waves and sync changes
          </h1>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Track what the archive knows about each official release, what changed
          during the last sync, and which records came from official bundle
          fallbacks.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Total records" value={metadata.totalRecords} />
        <Metric label="New last sync" value={metadata.newRecordCount} />
        <Metric label="Changed last sync" value={metadata.changedRecordCount} />
        <Metric label="Sync status" value={metadata.status} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-950">
            <FileStack size={17} className="text-teal-700" />
            Known official releases
          </div>
          <div className="divide-y divide-slate-200">
            {releases.map((release) => {
              const releaseCases = cases.filter(
                (caseRecord) => caseRecord.releaseDate === release.releaseDate
              );
              const byType = countByType(releaseCases);
              return (
                <article
                  key={release.id}
                  className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
                        {formatDate(release.releaseDate)}
                      </span>
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
                        {release.fileCount} files
                      </span>
                    </div>
                    <h2 className="mt-3 font-[var(--font-space)] text-2xl font-semibold text-slate-950">
                      {release.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {release.notes ?? "Official release record."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                      {Object.entries(byType).map(([type, count]) => (
                        <span
                          key={type}
                            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-semibold"
                        >
                          {labelMediaType(type as MediaType)}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Link
                      href={`/timeline?release=${encodeURIComponent(release.releaseDate ?? "unknown")}`}
                      className="inline-flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
                    >
                      Timeline <ArrowRight size={15} />
                    </Link>
                    <a
                      href={release.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
                    >
                      Source <ExternalLink size={15} />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <GitCompareArrows size={17} className="text-pink-600" />
            Last sync delta
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Last sync: {formatDate(metadata.lastSyncedAt.slice(0, 10))}.
          </p>
          <div className="mt-4 max-h-[38rem] space-y-2 overflow-auto pr-1 ufo-scrollbar">
            {latestNewCases.length ? (
              latestNewCases.map((caseRecord) => (
                <Link
                  key={caseRecord.id}
                  href={`/case/${caseRecord.id}`}
                  className="block rounded-md border border-slate-200 bg-slate-50 p-3 transition hover:border-teal-200 hover:bg-teal-50"
                >
                  <span className="line-clamp-2 text-sm font-semibold text-slate-950">
                    {caseRecord.title}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {formatDate(caseRecord.releaseDate)} / {labelMediaType(caseRecord.type)}
                  </span>
                </Link>
              ))
            ) : (
              <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                No new records were reported in the latest sync metadata.
              </p>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
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

function countByType(cases: ReturnType<typeof getCases>) {
  return cases.reduce<Partial<Record<MediaType, number>>>((counts, caseRecord) => {
    counts[caseRecord.type] = (counts[caseRecord.type] ?? 0) + 1;
    return counts;
  }, {});
}
