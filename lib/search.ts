"use client";

import Fuse from "fuse.js";
import type { CaseRecord } from "@/lib/types";

export type CaseFilters = {
  query: string;
  agency: string;
  year: string;
  type: string;
  tag: string;
};

export const emptyFilters: CaseFilters = {
  query: "",
  agency: "all",
  year: "all",
  type: "all",
  tag: "all"
};

export function filterCases(cases: CaseRecord[], filters: CaseFilters) {
  let current = cases;

  if (filters.query.trim()) {
    const fuse = new Fuse(current, {
      threshold: 0.35,
      ignoreLocation: true,
      keys: [
        "title",
        "agency",
        "locationName",
        "summary",
        "tags",
        "releaseDate",
        "incidentDate",
        "type"
      ]
    });
    current = fuse.search(filters.query.trim()).map((result) => result.item);
  }

  return current.filter((item) => {
    const years = [
      item.incidentDate?.slice(0, 4),
      item.releaseDate?.slice(0, 4)
    ].filter(Boolean);
    return (
      (filters.agency === "all" || item.agency === filters.agency) &&
      (filters.year === "all" || years.includes(filters.year)) &&
      (filters.type === "all" || item.type === filters.type) &&
      (filters.tag === "all" || item.tags.includes(filters.tag))
    );
  });
}
