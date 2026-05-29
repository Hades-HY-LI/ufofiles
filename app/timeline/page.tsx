import type { Metadata } from "next";
import { Suspense } from "react";
import { JsonLd } from "@/components/JsonLd";
import { TimelineView } from "@/components/TimelineView";
import { getCases } from "@/lib/cases";
import { sortByNewestRelease } from "@/lib/dates";
import { buildItemListJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Timeline",
  description:
    "Browse official UFO/UAP records by release and incident dates while preserving incomplete official date fields.",
  path: "/timeline"
});

export default function TimelinePage() {
  const cases = sortByNewestRelease(getCases());

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <JsonLd
        data={buildItemListJsonLd({
          name: "UFO/UAP records timeline",
          description: "Chronological index of official-source UFO/UAP case records.",
          path: "/timeline",
          cases
        })}
      />
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
            Timeline
          </p>
          <h1 className="mt-2 font-[var(--font-space)] text-4xl font-semibold text-white">
            Releases and incidents in context
          </h1>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-400">
          Track release waves first, while preserving incident dates where the
          official files include them.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="rounded-lg border border-white/10 bg-slate-950/70 p-10 text-center text-sm text-slate-400 shadow-panel">
            Loading timeline...
          </div>
        }
      >
        <TimelineView cases={cases} />
      </Suspense>
    </main>
  );
}
