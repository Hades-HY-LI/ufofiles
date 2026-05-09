"use client";

import { useMemo, useState } from "react";
import type { CaseRecord } from "@/lib/types";
import { emptyFilters, filterCases } from "@/lib/search";
import type { CaseFilters } from "@/lib/search";
import { CaseCard } from "@/components/CaseCard";
import { SearchFilters } from "@/components/SearchFilters";
import { EmptyState } from "@/components/EmptyState";

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
  const [filters, setFilters] = useState<CaseFilters>(emptyFilters);
  const results = useMemo(() => filterCases(cases, filters), [cases, filters]);

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <SearchFilters
        filters={filters}
        options={options}
        resultCount={results.length}
        totalCount={cases.length}
        onChange={setFilters}
        onReset={() => setFilters(emptyFilters)}
      />
      <section>
        {results.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((caseRecord) => (
              <CaseCard key={caseRecord.id} caseRecord={caseRecord} />
            ))}
          </div>
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
