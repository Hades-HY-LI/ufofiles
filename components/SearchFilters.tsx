"use client";

import { Filter, Search, X } from "lucide-react";
import type { MediaType } from "@/lib/types";
import type { CaseFilters } from "@/lib/search";
import { labelMediaType } from "@/lib/filters";
import { clsx } from "@/lib/utils";

type FilterOptions = {
  agencies: string[];
  years: string[];
  types: string[];
  tags: string[];
};

type SearchFiltersProps = {
  filters: CaseFilters;
  options: FilterOptions;
  resultCount: number;
  totalCount: number;
  compact?: boolean;
  onChange: (next: CaseFilters) => void;
  onReset: () => void;
};

export function SearchFilters({
  filters,
  options,
  resultCount,
  totalCount,
  compact = false,
  onChange,
  onReset
}: SearchFiltersProps) {
  const update = (patch: Partial<CaseFilters>) => onChange({ ...filters, ...patch });

  return (
    <aside
      className={clsx(
        "rounded-lg border border-neutral-200 bg-white p-4 shadow-sm",
        !compact && "lg:sticky lg:top-28"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter size={17} className="text-neutral-700" />
          <h2 className="font-[var(--font-space)] text-base font-semibold text-neutral-950">
            Search archive
          </h2>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 transition hover:text-neutral-950"
        >
          <X size={14} /> Reset
        </button>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Showing {resultCount} of {totalCount} official-source records.
      </p>

      <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
        Search
      </label>
      <div className="mt-2 flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
        <Search size={16} className="text-neutral-500" />
        <input
          value={filters.query}
          onChange={(event) => update({ query: event.target.value })}
          placeholder="Title, agency, date, location"
          className="min-w-0 flex-1 bg-transparent text-sm text-neutral-950 outline-none placeholder:text-neutral-400"
        />
      </div>

      <FilterSelect
        label="Agency"
        value={filters.agency}
        options={options.agencies}
        onChange={(agency) => update({ agency })}
      />
      <FilterSelect
        label="Year"
        value={filters.year}
        options={options.years}
        onChange={(year) => update({ year })}
      />
      <FilterSelect
        label="Media type"
        value={filters.type}
        options={options.types}
        format={(value) => labelMediaType(value as MediaType)}
        onChange={(type) => update({ type })}
      />
      <FilterSelect
        label="Tags"
        value={filters.tag}
        options={options.tags}
        onChange={(tag) => update({ tag })}
      />
    </aside>
  );
}

function FilterSelect({
  label,
  value,
  options,
  format,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  format?: (value: string) => string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-200"
      >
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {format ? format(option) : option}
          </option>
        ))}
      </select>
    </label>
  );
}
