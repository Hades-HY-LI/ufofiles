"use client";

import type { CaseRecord } from "@/lib/types";
import { MapView } from "@/components/MapView";

export function MapShell({ cases }: { cases: CaseRecord[] }) {
  return <MapView cases={cases} />;
}
