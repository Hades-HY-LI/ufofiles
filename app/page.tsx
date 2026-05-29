import Link from "next/link";
import { Clock3, GitBranch, Search, MapPinned } from "lucide-react";
import { Hero } from "@/components/Hero";
import { CaseCard } from "@/components/CaseCard";
import { JsonLd } from "@/components/JsonLd";
import { getCases, getFeaturedCases, getSyncMetadata } from "@/lib/cases";
import { buildDatasetJsonLd, buildItemListJsonLd } from "@/lib/seo";

const featureCards = [
  {
    title: "Timeline",
    description:
      "Track incident dates and release dates separately so each record keeps its historical and publication context.",
    href: "/timeline",
    icon: Clock3
  },
  {
    title: "Map",
    description:
      "Inspect cases with known coordinates while keeping unknown-location records visible in the archive.",
    href: "/map",
    icon: MapPinned
  },
  {
    title: "Relationship Graph",
    description:
      "Follow strong links between files by release, agency, tags, media type, and recurring case terms.",
    href: "/graph",
    icon: GitBranch
  },
  {
    title: "Search Archive",
    description:
      "Search titles, agencies, locations, dates, summaries, and tags across official-source records.",
    href: "/explore",
    icon: Search
  }
];

export default function HomePage() {
  const cases = getCases();
  const featuredCases = getFeaturedCases(4);
  const syncMetadata = getSyncMetadata();

  return (
    <main>
      <JsonLd
        data={[
          buildDatasetJsonLd(syncMetadata),
          buildItemListJsonLd({
            name: "Featured official UFO/UAP records",
            description: "Featured case records from the official-source UFO Files Archive.",
            path: "/",
            cases: featuredCases
          })
        ]}
      />
      <Hero
        featuredCases={featuredCases}
        totalCases={cases.length}
        syncMetadata={syncMetadata}
      />
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.href}
                href={feature.href}
                className="rounded-lg border border-white/10 bg-slate-950/55 p-6 shadow-panel transition hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-slate-900/70"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
                  <Icon size={21} />
                </div>
                <h2 className="mt-5 font-[var(--font-space)] text-xl font-semibold text-white">
                  {feature.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {feature.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
              Featured
            </p>
            <h2 className="mt-2 font-[var(--font-space)] text-3xl font-semibold text-white">
              Latest official-source records
            </h2>
          </div>
          <Link href="/explore" className="text-sm font-semibold text-cyan-100 hover:text-white">
            Browse all cases
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featuredCases.map((caseRecord) => (
            <CaseCard key={caseRecord.id} caseRecord={caseRecord} />
          ))}
        </div>
      </section>
    </main>
  );
}
