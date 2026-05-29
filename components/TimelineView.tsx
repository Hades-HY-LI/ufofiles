"use client";

import Link from "next/link";
import { CalendarDays, FileText, Image as ImageIcon, RadioTower, Search, Video, Volume2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import type { CaseRecord, MediaType } from "@/lib/types";
import { formatDate } from "@/lib/dates";
import { labelMediaType } from "@/lib/filters";
import { getOfficialSourceHref } from "@/lib/source-links";
import { clsx } from "@/lib/utils";

type TimelineViewProps = {
  cases: CaseRecord[];
};

const typeIcons: Record<MediaType, typeof FileText> = {
  document: FileText,
  image: ImageIcon,
  video: Video,
  audio: Volume2,
  unknown: RadioTower
};

export function TimelineView({ cases }: TimelineViewProps) {
  const releases = useMemo(() => releaseOptions(cases), [cases]);
  const searchParams = useSearchParams();
  const releaseParam = searchParams.get("release");
  const [release, setRelease] = useState(() =>
    normalizeReleaseFilter(releaseParam, releases)
  );
  const [type, setType] = useState<MediaType | "all">("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setRelease(normalizeReleaseFilter(releaseParam, releases));
  }, [releaseParam, releases]);

  const filterBase = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cases.filter((caseRecord) => {
      const releaseKey = caseRecord.releaseDate ?? "unknown";
      const haystack = `${caseRecord.title} ${caseRecord.summary} ${caseRecord.agency} ${caseRecord.tags.join(" ")}`.toLowerCase();
      return (
        (release === "all" || releaseKey === release) &&
        (!needle || haystack.includes(needle))
      );
    });
  }, [cases, query, release]);

  const filtered = useMemo(() => {
    return filterBase.filter(
      (caseRecord) => type === "all" || caseRecord.type === type
    );
  }, [filterBase, type]);

  const grouped = groupByReleaseYear(filtered);
  const stats = timelineStats(filtered);
  const typeStats = timelineStats(filterBase);

  return (
    <div className="grid gap-5 lg:grid-cols-[19rem_1fr]">
      <aside className="h-fit rounded-lg border border-white/10 bg-slate-950/72 p-4 shadow-panel lg:sticky lg:top-28">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <CalendarDays size={17} className="text-cyan-200" />
          Timeline controls
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Showing {filtered.length} of {cases.length} records across release
          and incident dates.
        </p>

        <label className="mt-5 block">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Search
          </span>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-white/10 bg-black/30 px-3 py-2">
            <Search size={15} className="text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Title, tag, agency"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
            />
          </div>
        </label>

        <ControlGroup label="Release">
          <button type="button" onClick={() => setRelease("all")} className={filterButton(release === "all")}>
            All releases
          </button>
          {releases.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setRelease(item.value)}
              className={filterButton(release === item.value)}
            >
              {item.label}
              <span>{item.count}</span>
            </button>
          ))}
        </ControlGroup>

        <ControlGroup label="Type">
          {(["all", "document", "image", "video", "audio", "unknown"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setType(item)}
              className={filterButton(type === item)}
            >
              {item === "all" ? "All types" : labelMediaType(item)}
              <span>{item === "all" ? filterBase.length : typeStats.byType[item] ?? 0}</span>
            </button>
          ))}
        </ControlGroup>
      </aside>

      <section className="min-w-0 rounded-lg border border-white/10 bg-slate-950/55 shadow-panel">
        <div className="grid border-b border-white/10 sm:grid-cols-3">
          <TimelineMetric label="Records" value={filtered.length} />
          <TimelineMetric label="Release years" value={grouped.length} />
          <TimelineMetric label="Newest release" value={formatDate(stats.newestRelease, "Unknown")} />
        </div>

        <div className="divide-y divide-white/10">
          {grouped.map((group) => (
            <div key={group.year} className="grid gap-0 lg:grid-cols-[8rem_1fr]">
              <div className="border-b border-white/10 bg-white/[0.025] px-4 py-4 lg:border-b-0 lg:border-r lg:border-white/10">
                <div className="font-[var(--font-space)] text-2xl font-semibold text-white">
                  {group.year}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                  {group.items.length} files
                </div>
              </div>
              <div className="relative divide-y divide-white/[0.07]">
                <div className="absolute left-[6.15rem] top-0 hidden h-full w-px bg-gradient-to-b from-cyan-300/50 via-white/10 to-transparent md:block" />
                {group.items.map((caseRecord) => (
                  <TimelineRow key={caseRecord.id} caseRecord={caseRecord} />
                ))}
              </div>
            </div>
          ))}
          {!grouped.length ? (
            <div className="p-10 text-center text-sm text-slate-400">
              No records match these timeline filters.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function TimelineRow({ caseRecord }: { caseRecord: CaseRecord }) {
  const Icon = typeIcons[caseRecord.type];
  const sourceHref = getOfficialSourceHref(caseRecord);
  return (
    <article className="grid gap-3 px-4 py-4 transition hover:bg-cyan-300/[0.045] md:grid-cols-[5.25rem_1fr_auto] md:items-start">
      <div className="text-sm">
        <div className="text-cyan-100">{formatDate(caseRecord.releaseDate, "Unreleased")}</div>
        <div className="mt-1 text-xs text-slate-500">
          Incident {formatDate(caseRecord.incidentDate)}
        </div>
      </div>
      <div className="min-w-0 md:pl-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-slate-300">
            <Icon size={13} className="text-cyan-200" />
            {labelMediaType(caseRecord.type)}
          </span>
          <span className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-xs text-emerald-100">
            Official source
          </span>
          {caseRecord.tags.includes("release-02") ? (
            <span className="rounded-md border border-fuchsia-300/20 bg-fuchsia-300/10 px-2 py-1 text-xs text-fuchsia-100">
              Release 02
            </span>
          ) : null}
        </div>
        <h2 className="mt-2 line-clamp-2 font-[var(--font-space)] text-base font-semibold leading-6 text-white">
          <Link href={`/case/${caseRecord.id}`}>{caseRecord.title}</Link>
        </h2>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-400">
          {caseRecord.summary}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        <Link
          href={`/case/${caseRecord.id}`}
          className="rounded-md bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-200"
        >
          Open
        </Link>
        <a
          href={sourceHref}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:text-white"
        >
          Source
        </a>
      </div>
    </article>
  );
}

function ControlGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-5">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

function TimelineMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-b border-white/10 p-4 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="font-[var(--font-space)] text-2xl font-semibold text-white">
        {value}
      </div>
      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
    </div>
  );
}

function filterButton(active: boolean) {
  return clsx(
    "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition",
    active
      ? "border-cyan-300/45 bg-cyan-300/15 text-cyan-50"
      : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:text-white"
  );
}

function releaseOptions(cases: CaseRecord[]) {
  const map = new Map<string, number>();
  for (const caseRecord of cases) {
    const key = caseRecord.releaseDate ?? "unknown";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([value, count]) => ({
      value,
      count,
      label: value === "unknown" ? "Unknown release" : formatDate(value)
    }));
}

function normalizeReleaseFilter(
  release: string | null,
  releases: Array<{ value: string }>
) {
  if (!release) return "all";
  return releases.some((item) => item.value === release) ? release : "all";
}

function groupByReleaseYear(cases: CaseRecord[]) {
  const sorted = [...cases].sort((left, right) => {
    const release = (right.releaseDate ?? "").localeCompare(left.releaseDate ?? "");
    if (release !== 0) return release;
    return left.title.localeCompare(right.title);
  });
  const map = new Map<string, CaseRecord[]>();
  for (const caseRecord of sorted) {
    const year = caseRecord.releaseDate?.slice(0, 4) ?? "Unknown";
    map.set(year, [...(map.get(year) ?? []), caseRecord]);
  }
  return [...map.entries()].map(([year, items]) => ({ year, items }));
}

function timelineStats(cases: CaseRecord[]) {
  const byType: Partial<Record<MediaType, number>> = {};
  let newestRelease: string | null = null;
  for (const caseRecord of cases) {
    byType[caseRecord.type] = (byType[caseRecord.type] ?? 0) + 1;
    if (caseRecord.releaseDate && (!newestRelease || caseRecord.releaseDate > newestRelease)) {
      newestRelease = caseRecord.releaseDate;
    }
  }
  return { byType, newestRelease };
}
