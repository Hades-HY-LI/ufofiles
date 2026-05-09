import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "About"
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
        About
      </p>
      <h1 className="mt-3 font-[var(--font-space)] text-4xl font-semibold text-white">
        A fan-built archive for official UFO/UAP releases.
      </h1>
      <div className="mt-8 space-y-6 text-base leading-8 text-slate-300">
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
        <div className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-5 text-cyan-50">
          This is an independent fan archive and is not affiliated with the U.S.
          government.
        </div>
        <a
          href="https://www.war.gov/ufo/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200"
        >
          Official PURSUE source <ExternalLink size={16} />
        </a>
      </div>
      <div className="mt-10 rounded-lg border border-white/10 bg-slate-950/60 p-6">
        <h2 className="font-[var(--font-space)] text-2xl font-semibold text-white">
          Launch scope
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          The MVP intentionally excludes accounts, comments, submissions, and
          community features. The first job is to make the official archive
          fast, clear, and useful.
        </p>
        <Link
          href="/explore"
          className="mt-5 inline-flex text-sm font-semibold text-cyan-100 hover:text-white"
        >
          Start exploring
        </Link>
      </div>
    </main>
  );
}
