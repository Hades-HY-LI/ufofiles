"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Grid2X2, List, SlidersHorizontal } from "lucide-react";
import type { CaseRecord } from "@/lib/types";
import { emptyFilters, filterCases } from "@/lib/search";
import type { CaseFilters } from "@/lib/search";
import { CaseCard } from "@/components/CaseCard";
import { SearchFilters } from "@/components/SearchFilters";
import { EmptyState } from "@/components/EmptyState";
import { formatDate } from "@/lib/dates";
import { labelMediaType } from "@/lib/filters";
import { clsx } from "@/lib/utils";

type CaseGridProps = {
  cases: CaseRecord[];
  options: {
    agencies: string[];
    years: string[];
    types: string[];
    tags: string[];
  };
};

export function CaseGrid({ cases, options }: CaseGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const filters = useMemo(
    () => filtersFromParams(searchParams, options),
    [searchParams, options]
  );
  const view = readView(searchParams);
  const sort = readSort(searchParams);
  const explorePath = useMemo(
    () => makeExplorePath(filters, sort, view),
    [filters, sort, view]
  );
  const setExploreState = useCallback(
    (next: { filters?: CaseFilters; sort?: SortMode; view?: ViewMode }) => {
      const nextFilters = next.filters ?? filters;
      const nextSort = next.sort ?? sort;
      const nextView = next.view ?? view;
      const nextPath = makeExplorePath(nextFilters, nextSort, nextView);
      router.replace(nextPath === "/explore" ? pathname : nextPath, { scroll: false });
    },
    [filters, pathname, router, sort, view]
  );
  const results = useMemo(
    () => sortCases(filterCases(cases, filters), sort),
    [cases, filters, sort]
  );

  if (!mounted) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Loading archive filters...
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <SearchFilters
        filters={filters}
        options={options}
        resultCount={results.length}
        totalCount={cases.length}
        onChange={(nextFilters) => setExploreState({ filters: nextFilters })}
        onReset={() => setExploreState({ filters: emptyFilters, sort: "latest", view: "cards" })}
      />
      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <SlidersHorizontal size={16} className="text-neutral-700" />
            {results.length} visible records
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sort}
              onChange={(event) => setExploreState({ sort: event.target.value as SortMode })}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              aria-label="Sort records"
            >
              <option value="latest">Latest release</option>
              <option value="title">Title</option>
              <option value="type">Media type</option>
            </select>
            <button
              type="button"
              onClick={() => setExploreState({ view: "cards" })}
              className={viewButton(view === "cards")}
              aria-label="Card view"
            >
              <Grid2X2 size={16} />
            </button>
            <button
              type="button"
              onClick={() => setExploreState({ view: "list" })}
              className={viewButton(view === "list")}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>
        {results.length ? (
          view === "cards" ? (
            <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,21rem),1fr))] gap-4">
              {results.map((caseRecord) => (
                <div key={caseRecord.id} className="min-w-0">
                  <CaseCard
                    caseRecord={caseRecord}
                    caseHref={caseHref(caseRecord, explorePath)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              {results.map((caseRecord) => (
                <CaseListRow
                  key={caseRecord.id}
                  caseRecord={caseRecord}
                  caseHref={caseHref(caseRecord, explorePath)}
                />
              ))}
            </div>
          )
        ) : (
          <EmptyState
            title="No matching records"
            description="Try widening the search or clearing one of the filters. Unknown official fields are preserved instead of hidden."
          />
        )}
      </section>
    </div>
  );
}

type SortMode = "latest" | "title" | "type";
type ViewMode = "cards" | "list";

function CaseListRow({
  caseRecord,
  caseHref
}: {
  caseRecord: CaseRecord;
  caseHref: string;
}) {
  return (
    <article className="grid min-w-0 gap-3 border-b border-neutral-200 p-4 transition last:border-b-0 hover:bg-neutral-50 xl:grid-cols-[minmax(0,1fr)_8.5rem_8rem_auto] xl:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
            {labelMediaType(caseRecord.type)}
          </span>
          {caseRecord.tags.includes("release-02") ? (
            <span className="rounded-md border border-neutral-200 bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">
              Release 02
            </span>
          ) : null}
        </div>
        <h3 className="mt-2 line-clamp-1 font-[var(--font-space)] text-base font-semibold text-slate-950">
          <Link href={caseHref}>{caseRecord.title}</Link>
        </h3>
        <p className="mt-1 line-clamp-1 text-sm text-slate-600">
          {caseRecord.summary}
        </p>
      </div>
      <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 xl:block">
        <span className="font-medium xl:font-normal">{formatDate(caseRecord.releaseDate)}</span>
      </div>
      <div className="min-w-0 text-sm text-slate-600 xl:truncate">{caseRecord.agency}</div>
      <div className="flex shrink-0 flex-wrap gap-2 xl:flex-nowrap xl:justify-end">
        <Link
          href={caseHref}
          className="shrink-0 rounded-md bg-neutral-950 px-3 py-2 text-center text-sm font-bold text-white transition hover:bg-neutral-800"
        >
          Open
        </Link>
      </div>
    </article>
  );
}

function sortCases(cases: CaseRecord[], sort: SortMode) {
  return [...cases].sort((left, right) => {
    if (sort === "title") return left.title.localeCompare(right.title);
    if (sort === "type") {
      const type = left.type.localeCompare(right.type);
      return type || left.title.localeCompare(right.title);
    }
    return (right.releaseDate ?? "").localeCompare(left.releaseDate ?? "") ||
      left.title.localeCompare(right.title);
  });
}

function filtersFromParams(
  searchParams: Pick<URLSearchParams, "get">,
  options: CaseGridProps["options"]
): CaseFilters {
  const query = searchParams.get("query") ?? "";
  const agency = readOption(searchParams, "agency", options.agencies);
  const year = readOption(searchParams, "year", options.years);
  const type = readOption(searchParams, "type", options.types);
  const tag = readOption(searchParams, "tag", options.tags);

  return { query, agency, year, type, tag };
}

function readOption(
  searchParams: Pick<URLSearchParams, "get">,
  key: keyof CaseFilters,
  options: string[]
) {
  const value = searchParams.get(key);
  return value && options.includes(value) ? value : "all";
}

function readSort(searchParams: Pick<URLSearchParams, "get">): SortMode {
  const value = searchParams.get("sort");
  return value === "title" || value === "type" ? value : "latest";
}

function readView(searchParams: Pick<URLSearchParams, "get">): ViewMode {
  return searchParams.get("view") === "list" ? "list" : "cards";
}

function makeExplorePath(filters: CaseFilters, sort: SortMode, view: ViewMode) {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("query", filters.query.trim());
  if (filters.agency !== "all") params.set("agency", filters.agency);
  if (filters.year !== "all") params.set("year", filters.year);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.tag !== "all") params.set("tag", filters.tag);
  if (sort !== "latest") params.set("sort", sort);
  if (view !== "cards") params.set("view", view);

  const query = params.toString();
  return `/explore${query ? `?${query}` : ""}`;
}

function caseHref(caseRecord: CaseRecord, explorePath: string) {
  return `/case/${caseRecord.id}?from=${encodeURIComponent(explorePath)}`;
}

function viewButton(active: boolean) {
  return clsx(
    "inline-flex h-9 w-9 items-center justify-center rounded-md border transition",
    active
      ? "border-neutral-950 bg-neutral-950 text-white"
      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
  );
}
