import type { Metadata } from "next";
import { Suspense } from "react";
import { CaseGrid } from "@/components/CaseGrid";
import { JsonLd } from "@/components/JsonLd";
import { getCases, getFilterOptions } from "@/lib/cases";
import { formatDate, sortByNewestRelease } from "@/lib/dates";
import { labelMediaType } from "@/lib/filters";
import { buildItemListJsonLd, createPageMetadata } from "@/lib/seo";
import type { CaseRecord } from "@/lib/types";

export const metadata: Metadata = createPageMetadata({
  title: "Explore",
  description:
    "Search and browse official-source UFO/UAP case records by agency, release year, media type, tags, location, and summary.",
  path: "/explore"
});

export default function ExplorePage() {
  const cases = sortByNewestRelease(getCases());
  const options = getFilterOptions(cases);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <JsonLd
        data={buildItemListJsonLd({
          name: "Official UFO/UAP case records",
          description: "Searchable index of official-source UFO/UAP records in the archive.",
          path: "/explore",
          cases
        })}
      />
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
            Case explorer
          </p>
          <h1 className="mt-2 font-[var(--font-space)] text-4xl font-semibold text-slate-950">
            Browse official UFO/UAP records
          </h1>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Search and filter official-source records. Incomplete dates, locations,
          and media links are preserved so future releases can sync cleanly.
        </p>
      </div>
      <Suspense fallback={<StaticCaseList cases={cases} />}>
        <CaseGrid cases={cases} options={options} />
      </Suspense>
    </main>
  );
}

function StaticCaseList({ cases }: { cases: CaseRecord[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-950">
        {cases.length} official-source records
      </div>
      <div className="divide-y divide-white/10">
        {cases.map((caseRecord) => (
          <article key={caseRecord.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_10rem_8rem]">
            <div>
              <h2 className="font-[var(--font-space)] text-base font-semibold text-slate-950">
                <a href={`/case/${caseRecord.id}`}>{caseRecord.title}</a>
              </h2>
              <p className="mt-1 text-sm text-slate-500">{caseRecord.agency}</p>
            </div>
            <div className="text-sm text-slate-600">
              {formatDate(caseRecord.releaseDate)}
            </div>
            <div className="text-sm text-slate-600">
              {labelMediaType(caseRecord.type)}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
