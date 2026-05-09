import type { CaseRecord } from "@/lib/types";

export function getMapCases(cases: CaseRecord[]) {
  return cases.filter(
    (item) => item.latitude !== null && item.longitude !== null
  );
}
