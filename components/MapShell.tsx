"use client";

import dynamic from "next/dynamic";
import type { CaseRecord } from "@/lib/types";

const DynamicMap = dynamic(
  () => import("@/components/MapView").then((module) => module.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[36rem] items-center justify-center rounded-lg border border-white/10 bg-slate-950/70 text-slate-400">
        Loading map...
      </div>
    )
  }
);

export function MapShell({ cases }: { cases: CaseRecord[] }) {
  return <DynamicMap cases={cases} />;
}
