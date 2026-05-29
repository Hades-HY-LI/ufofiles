import type { Metadata } from "next";
import { Suspense } from "react";
import { JsonLd } from "@/components/JsonLd";
import { getCases } from "@/lib/cases";
import { MapShell } from "@/components/MapShell";
import { buildItemListJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Map",
  description:
    "Map official UFO/UAP records with known coordinates while keeping unmapped official records discoverable.",
  path: "/map"
});

export default function MapPage() {
  const cases = getCases();

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <JsonLd
        data={buildItemListJsonLd({
          name: "Mapped UFO/UAP records",
          description: "Official-source UFO/UAP records with archive-normalized location metadata.",
          path: "/map",
          cases
        })}
      />
      <Suspense
        fallback={
          <div className="flex min-h-[36rem] items-center justify-center rounded-lg border border-white/10 bg-slate-950/70 text-slate-400">
            Loading map...
          </div>
        }
      >
        <MapShell cases={cases} />
      </Suspense>
    </main>
  );
}
