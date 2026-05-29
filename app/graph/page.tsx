import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { RelationshipGraph } from "@/components/RelationshipGraph";
import { getCases } from "@/lib/cases";
import { buildCaseGraph } from "@/lib/relationships";
import { buildItemListJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Relationship Graph",
  description:
    "Explore archive-computed relationships between official UFO/UAP records by release, agency, media type, tags, and recurring terms.",
  path: "/graph"
});

export default function GraphPage() {
  const cases = getCases();
  const graph = buildCaseGraph(cases);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <JsonLd
        data={buildItemListJsonLd({
          name: "Connected UFO/UAP archive records",
          description: "Case records used to build the UFO Files Archive relationship graph.",
          path: "/graph",
          cases
        })}
      />
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
            Connected archive
          </p>
          <h1 className="mt-2 font-[var(--font-space)] text-4xl font-semibold text-white">
            Relationship graph
          </h1>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-400">
          Explore strong links between official files based on shared releases,
          agencies, media types, tags, and recurring terms. Larger nodes indicate
          files that connect more heavily across the archive.
        </p>
      </div>
      <section className="mb-5 grid gap-3 rounded-lg border border-white/10 bg-slate-950/65 p-4 shadow-panel lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h2 className="font-[var(--font-space)] text-lg font-semibold text-white">
            How links are calculated
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Relationships are archive-computed signals, not official
            determinations. A line appears when two files reach a score of 5 or
            higher.
          </p>
        </div>
        <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
          <ScoreRule label="Same release" value="+3" />
          <ScoreRule label="Same agency" value="+2" />
          <ScoreRule label="Same media type" value="+1.5" />
          <ScoreRule label="Shared tags" value="up to +4" />
          <ScoreRule label="Shared terms" value="up to +6" />
          <ScoreRule label="Minimum visible score" value="5" />
        </div>
      </section>
      <RelationshipGraph graph={graph} />
    </main>
  );
}

function ScoreRule({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
      <span>{label}</span>
      <span className="font-semibold text-cyan-100">{value}</span>
    </div>
  );
}
