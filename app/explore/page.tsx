import type { Metadata } from "next";
import { CaseGrid } from "@/components/CaseGrid";
import { getCases, getFilterOptions } from "@/lib/cases";
import { sortByNewestRelease } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Explore"
};

export default function ExplorePage() {
  const cases = sortByNewestRelease(getCases());
  const options = getFilterOptions(cases);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
            Case explorer
          </p>
          <h1 className="mt-2 font-[var(--font-space)] text-4xl font-semibold text-white">
            Browse official UFO/UAP records
          </h1>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-400">
          Search and filter official-source records. Incomplete dates, locations,
          and media links are preserved so future releases can sync cleanly.
        </p>
      </div>
      <CaseGrid cases={cases} options={options} />
    </main>
  );
}
