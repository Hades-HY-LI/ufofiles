"use client";

import Link from "next/link";
import {
  CalendarDays,
  ChevronDown,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Layers3,
  LocateFixed,
  RadioTower,
  Search,
  ShieldCheck,
  Video,
  Volume2
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import type { CaseRecord, MediaType } from "@/lib/types";
import { formatDate } from "@/lib/dates";
import { labelMediaType } from "@/lib/filters";
import { getOfficialMediaHref, getOfficialSourceHref } from "@/lib/source-links";
import { clsx } from "@/lib/utils";

type TimelineViewProps = {
  cases: CaseRecord[];
};

type Density = "compact" | "normal" | "detailed";

const typeIcons: Record<MediaType, typeof FileText> = {
  document: FileText,
  image: ImageIcon,
  video: Video,
  audio: Volume2,
  unknown: RadioTower
};

const typeStyles: Record<MediaType, { bar: string; chip: string }> = {
  document: {
    bar: "bg-amber-500",
    chip: "border-amber-200 bg-amber-50 text-amber-700"
  },
  image: {
    bar: "bg-teal-600",
    chip: "border-teal-200 bg-teal-50 text-teal-700"
  },
  video: {
    bar: "bg-blue-600",
    chip: "border-blue-200 bg-blue-50 text-blue-700"
  },
  audio: {
    bar: "bg-fuchsia-600",
    chip: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
  },
  unknown: {
    bar: "bg-slate-400",
    chip: "border-slate-200 bg-slate-50 text-slate-600"
  }
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
  const [density, setDensity] = useState<Density>("normal");
  const [openId, setOpenId] = useState(cases[0]?.id ?? "");
  const [activeRelease, setActiveRelease] = useState<string>("all");

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

  const filtered = useMemo(
    () =>
      filterBase.filter(
        (caseRecord) => type === "all" || caseRecord.type === type
      ),
    [filterBase, type]
  );

  const groups = useMemo(() => groupByRelease(filtered), [filtered]);
  const stats = timelineStats(filtered);
  const typeStats = timelineStats(filterBase);

  useEffect(() => {
    if (!groups.length) return;
    if (!groups.some((group) => group.key === activeRelease)) {
      setActiveRelease(groups[0].key);
    }
    if (openId && !filtered.some((caseRecord) => caseRecord.id === openId)) {
      setOpenId(filtered[0]?.id ?? "");
    }
  }, [activeRelease, filtered, groups, openId]);

  useEffect(() => {
    if (!groups.length) return;
    let frame = 0;
    const updateActiveRelease = () => {
      frame = 0;
      const marker = Math.min(window.innerHeight * 0.32, 280);
      let nextActive = groups[0].key;

      for (const group of groups) {
        const node = document.getElementById(releaseDomId(group.key));
        if (!node || node.getBoundingClientRect().top > marker) break;
        nextActive = group.key;
      }

      setActiveRelease((current) => current === nextActive ? current : nextActive);
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActiveRelease);
    };

    updateActiveRelease();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [groups]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_9.5rem]">
      <section className="min-w-0">
        <div className="z-20 mb-5 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur lg:sticky lg:top-[4.5rem]">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <ControlSelect label="Release" value={release} onChange={setRelease}>
                <option value="all">All releases</option>
                {releases.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label} ({item.count})
                  </option>
                ))}
              </ControlSelect>
              <ControlSelect
                label="Media type"
                value={type}
                onChange={(value) => setType(value as MediaType | "all")}
              >
                {(["all", "document", "image", "video", "audio", "unknown"] as const).map((item) => (
                  <option key={item} value={item}>
                    {item === "all" ? "All types" : labelMediaType(item)} (
                    {item === "all" ? filterBase.length : typeStats.byType[item] ?? 0})
                  </option>
                ))}
              </ControlSelect>
              <label className="sm:col-span-2">
                <span className="sr-only">Search within timeline</span>
                <div className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3">
                  <Search size={16} className="text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search within timeline..."
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>
            </div>
            <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
              {(["compact", "normal", "detailed"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setDensity(item)}
                  aria-pressed={density === item}
                  className={clsx(
                    "rounded px-3 py-2 text-xs font-semibold capitalize transition",
                    density === item
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-950"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <TimelineMetric label="Visible files" value={filtered.length} />
          <TimelineMetric label="Release waves" value={groups.length} />
          <TimelineMetric label="Newest release" value={formatDate(stats.newestRelease, "Unknown")} />
        </div>

        <div className="space-y-4">
          {groups.map((group, index) => (
            <ReleaseStage
              key={group.key}
              group={group}
              active={activeRelease === group.key}
              latest={index === 0}
              density={density}
              openId={openId}
              onOpen={setOpenId}
            />
          ))}
          {!groups.length ? (
            <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
              No records match these timeline filters.
            </div>
          ) : null}
        </div>
      </section>

      <aside className="hidden h-fit rounded-lg border border-slate-200 bg-white p-3 shadow-sm xl:sticky xl:top-28 xl:block">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Release timeline
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {groups.length} stages
        </p>
        <div className="mt-4 space-y-1.5 border-l border-slate-200 pl-3">
          {groups.map((group) => (
            <a
              key={group.key}
              href={`#${releaseDomId(group.key)}`}
              aria-current={activeRelease === group.key ? "location" : undefined}
              className={clsx(
                "relative block rounded-md px-2 py-1.5 text-xs transition",
                activeRelease === group.key
                  ? "bg-blue-50 text-blue-900"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              )}
            >
              <span
                className={clsx(
                  "absolute -left-[1.02rem] top-3 h-2.5 w-2.5 rounded-full border-2 bg-white",
                  activeRelease === group.key ? "border-blue-600" : "border-slate-300"
                )}
              />
              <span className="block font-semibold">
                {formatDate(group.releaseDate, "Unknown")}
              </span>
              <span className="mt-0.5 block text-[11px] text-slate-500">
                {group.items.length} files
              </span>
            </a>
          ))}
        </div>
      </aside>
    </div>
  );
}

function ReleaseStage({
  group,
  active,
  latest,
  density,
  openId,
  onOpen
}: {
  group: ReleaseGroup;
  active: boolean;
  latest: boolean;
  density: Density;
  openId: string;
  onOpen: (id: string) => void;
}) {
  return (
    <article
      id={releaseDomId(group.key)}
      data-release-key={group.key}
      className={clsx(
        "scroll-mt-36 overflow-hidden rounded-xl border bg-white shadow-sm transition",
        active ? "border-blue-300 ring-4 ring-blue-100" : "border-slate-200"
      )}
    >
      <div className="grid lg:grid-cols-[7.5rem_1fr]">
        <div className={clsx(
          "border-b border-slate-200 p-5 lg:border-b-0 lg:border-r",
          latest ? "bg-blue-50" : "bg-slate-50"
        )}>
          <div className="sticky top-40">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
              {monthLabel(group.releaseDate)}
            </div>
            <div className="mt-1 font-[var(--font-space)] text-5xl font-semibold leading-none text-slate-950">
              {dayLabel(group.releaseDate)}
            </div>
            <div className="mt-1 font-[var(--font-space)] text-xl font-semibold text-slate-700">
              {yearLabel(group.releaseDate)}
            </div>
            {latest ? (
              <span className="mt-4 inline-flex rounded-md border border-lime-200 bg-lime-50 px-2 py-1 text-xs font-bold text-lime-700">
                Latest
              </span>
            ) : null}
          </div>
        </div>
        <div>
          <header className="border-b border-slate-200 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h2 className="font-[var(--font-space)] text-2xl font-semibold text-slate-950">
                  {formatDate(group.releaseDate, "Unknown release")} Release
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {group.items.length} official-source files grouped by release date.
                </p>
              </div>
              <Link
                href={`/releases${group.releaseDate ? "" : ""}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-950"
              >
                View release tracker <ExternalLink size={15} />
              </Link>
            </div>
            <TypeHistogram counts={group.byType} total={group.items.length} />
          </header>
          <div className="divide-y divide-slate-200">
            {group.items.map((caseRecord) => (
              <TimelineRow
                key={caseRecord.id}
                caseRecord={caseRecord}
                open={openId === caseRecord.id}
                density={density}
                onOpen={() => onOpen(openId === caseRecord.id ? "" : caseRecord.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function TimelineRow({
  caseRecord,
  open,
  density,
  onOpen
}: {
  caseRecord: CaseRecord;
  open: boolean;
  density: Density;
  onOpen: () => void;
}) {
  const Icon = typeIcons[caseRecord.type];
  const sourceHref = getOfficialSourceHref(caseRecord);
  const mediaHref = getOfficialMediaHref(caseRecord);
  const canMap = caseRecord.latitude !== null && caseRecord.longitude !== null;
  const detailsId = `timeline-details-${caseRecord.id}`;

  return (
    <article className={clsx("transition", open ? "bg-blue-50/70" : "hover:bg-slate-50")}>
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={open}
        aria-controls={detailsId}
        className={clsx(
          "grid w-full gap-3 px-4 text-left md:grid-cols-[1fr_8.5rem_9rem_auto] md:items-center",
          density === "compact" ? "py-2.5" : density === "detailed" ? "py-5" : "py-4"
        )}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={clsx(
              "inline-flex items-center gap-1 rounded-md border text-xs font-semibold",
              density === "compact" ? "px-1.5 py-0.5" : "px-2 py-1",
              typeStyles[caseRecord.type].chip
            )}>
              <Icon size={13} />
              {labelMediaType(caseRecord.type)}
            </span>
            {density !== "compact" ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-lime-200 bg-lime-50 px-2 py-1 text-xs font-semibold text-lime-700">
                <ShieldCheck size={13} />
                Official source
              </span>
            ) : null}
          </div>
          <h3 className={clsx(
            "line-clamp-2 font-[var(--font-space)] font-semibold text-slate-950",
            density === "compact" ? "mt-1 text-sm" : "mt-2 text-base"
          )}>
            {caseRecord.title}
          </h3>
          {density !== "compact" ? (
            <p className={clsx(
              "mt-1 text-sm leading-6 text-slate-600",
              density === "detailed" ? "line-clamp-4" : "line-clamp-2"
            )}>
              {caseRecord.summary}
            </p>
          ) : null}
          {density === "detailed" ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <LocateFixed size={13} />
                {caseRecord.locationName}
              </span>
              {caseRecord.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-semibold">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="text-sm text-slate-600">
          <span className="block font-semibold text-slate-900">
            {formatDate(caseRecord.releaseDate)}
          </span>
          <span className="text-xs text-slate-500">
            Incident {formatDate(caseRecord.incidentDate)}
          </span>
        </div>
        <div className="line-clamp-1 text-sm text-slate-600">{caseRecord.agency}</div>
        <ChevronDown
          size={18}
          className={clsx("text-slate-400 transition", open && "rotate-180 text-blue-700")}
        />
      </button>
      {open ? (
        <div id={detailsId} className="grid gap-5 border-t border-blue-200 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_14rem_12rem]">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              File information
            </div>
            <p className="text-sm leading-6 text-slate-700">{caseRecord.summary}</p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Metadata label="Location" value={caseRecord.locationName} />
              <Metadata label="Confidence" value={caseRecord.confidence} />
              <Metadata label="Release date" value={formatDate(caseRecord.releaseDate)} />
              <Metadata label="Incident date" value={formatDate(caseRecord.incidentDate)} />
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {caseRecord.tags.slice(0, density === "detailed" ? 8 : 5).map((tag) => (
                <span key={tag} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Source URL
            </div>
            <a
              href={sourceHref}
              target="_blank"
              rel="noreferrer"
              className="break-words text-sm font-semibold text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-950"
            >
              {displayUrl(sourceHref)}
            </a>
            {mediaHref ? (
              <a
                href={mediaHref}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block break-words text-sm font-semibold text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-950"
              >
                {displayUrl(mediaHref)}
              </a>
            ) : null}
          </div>
          <div className="grid content-start gap-2">
            <Link href={`/case/${caseRecord.id}`} className="rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-bold text-white hover:bg-blue-700">
              View case
            </Link>
            <a href={sourceHref} target="_blank" rel="noreferrer" className="rounded-md border border-blue-200 bg-white px-3 py-2 text-center text-sm font-bold text-blue-700 hover:bg-blue-50">
              Official source
            </a>
            <Link href={canMap ? `/map?case=${caseRecord.id}` : "/map"} className="inline-flex items-center justify-center gap-2 rounded-md border border-lime-200 bg-white px-3 py-2 text-sm font-bold text-lime-700 hover:bg-lime-50">
              <LocateFixed size={15} />
              {canMap ? "View on map" : "Unmapped list"}
            </Link>
            <Link href="/graph" className="inline-flex items-center justify-center gap-2 rounded-md border border-fuchsia-200 bg-white px-3 py-2 text-sm font-bold text-fuchsia-700 hover:bg-fuchsia-50">
              <Layers3 size={15} />
              View graph
            </Link>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ControlSelect({
  label,
  value,
  onChange,
  children
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        {children}
      </select>
    </label>
  );
}

function TimelineMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="font-[var(--font-space)] text-2xl font-semibold text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
    </div>
  );
}

function TypeHistogram({ counts, total }: { counts: Partial<Record<MediaType, number>>; total: number }) {
  const segments = (["image", "document", "video", "audio", "unknown"] as const)
    .map((type) => ({ type, count: counts[type] ?? 0 }))
    .filter((item) => item.count > 0);

  return (
    <div className="mt-5">
      <div className="flex h-9 items-end gap-1 overflow-hidden">
        {segments.flatMap((segment) =>
          Array.from({ length: Math.min(28, Math.max(2, Math.round((segment.count / total) * 28))) }).map((_, index) => (
            <span
              key={`${segment.type}-${index}`}
              className={clsx("block w-2 rounded-t", typeStyles[segment.type].bar)}
              style={{ height: `${30 + ((index * 19) % 54)}%` }}
            />
          ))
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
        {segments.map((segment) => (
          <span key={segment.type} className="inline-flex items-center gap-1">
            <span className={clsx("h-2.5 w-2.5 rounded-sm", typeStyles[segment.type].bar)} />
            {labelMediaType(segment.type)} {segment.count}
          </span>
        ))}
      </div>
    </div>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-slate-800">{value}</dd>
    </div>
  );
}

type ReleaseGroup = {
  key: string;
  releaseDate: string | null;
  items: CaseRecord[];
  byType: Partial<Record<MediaType, number>>;
};

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

function groupByRelease(cases: CaseRecord[]): ReleaseGroup[] {
  const sorted = [...cases].sort((left, right) => {
    const release = (right.releaseDate ?? "").localeCompare(left.releaseDate ?? "");
    if (release !== 0) return release;
    return left.title.localeCompare(right.title);
  });
  const map = new Map<string, CaseRecord[]>();
  for (const caseRecord of sorted) {
    const key = caseRecord.releaseDate ?? "unknown";
    map.set(key, [...(map.get(key) ?? []), caseRecord]);
  }
  return [...map.entries()].map(([key, items]) => ({
    key,
    releaseDate: key === "unknown" ? null : key,
    items,
    byType: timelineStats(items).byType
  }));
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

function releaseDomId(key: string) {
  return `release-${key.replace(/[^a-z0-9-]/gi, "-")}`;
}

function monthLabel(date: string | null) {
  if (!date) return "Release";
  return new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(`${date}T00:00:00Z`));
}

function dayLabel(date: string | null) {
  if (!date) return "--";
  return new Intl.DateTimeFormat("en", { day: "2-digit" }).format(new Date(`${date}T00:00:00Z`));
}

function yearLabel(date: string | null) {
  return date?.slice(0, 4) ?? "Unknown";
}

function displayUrl(href: string) {
  try {
    const parsed = new URL(href);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return href;
  }
}
