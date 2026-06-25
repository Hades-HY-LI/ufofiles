import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { getSyncMetadata } from "@/lib/cases";
import { buildDatasetJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "About",
  description:
    "Source policy, limitations, and attribution for the independent UFO Files Archive of official UFO/UAP records.",
  path: "/about"
});

export default function AboutPage() {
  const syncMetadata = getSyncMetadata();

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={buildDatasetJsonLd(syncMetadata)} />
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
        About
      </p>
      <h1 className="mt-3 font-[var(--font-space)] text-4xl font-semibold text-slate-950">
        A fan-built archive for official UFO/UAP releases.
      </h1>
      <div className="mt-8 space-y-6 text-base leading-8 text-slate-700">
        <p>
          UFO Files Archive is a non-commercial project for exploring official
          UAP/UFO materials through search, timeline, map, and case detail
          views. The archive is designed for rolling releases, so new official
          files can become browsable records after sync.
        </p>
        <p>
          Official source data is treated as read-only. This site may add
          organization, summaries, tags, and interface affordances, but every
          case must retain a source link back to the official release.
        </p>
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-5 text-teal-900">
          This is an independent fan archive and is not affiliated with the U.S.
          government.
        </div>
        <a
          href="https://www.war.gov/ufo/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          Official PURSUE source <ExternalLink size={16} />
        </a>
      </div>
      <div className="mt-10 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-[var(--font-space)] text-2xl font-semibold text-slate-950">
          Launch scope
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The MVP intentionally excludes accounts, comments, submissions, and
          community features. The first job is to make the official archive
          fast, clear, and useful.
        </p>
        <Link
          href="/explore"
          className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-950"
        >
          Start exploring
        </Link>
      </div>
      <section
        id="license-and-attribution"
        className="mt-10 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="font-[var(--font-space)] text-2xl font-semibold text-slate-950">
          License and attribution
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
          <p>
            The project code is released under the MIT License in the public
            repository license file.
          </p>
          <p>
            Official government source data, document links, media links, and
            release metadata remain attributed to their official sources,
            primarily the public PURSUE materials at war.gov.
          </p>
          <p>
            UFO Files Archive organizes and links to public official-source
            materials. It does not claim ownership of those government records.
          </p>
        </div>
      </section>
    </main>
  );
}
