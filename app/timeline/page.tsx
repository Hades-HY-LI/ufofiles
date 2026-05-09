import type { Metadata } from "next";
import { TimelineView } from "@/components/TimelineView";
import { getCases } from "@/lib/cases";
import { sortByIncidentDate } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Timeline"
};

export default function TimelinePage() {
  const cases = sortByIncidentDate(getCases());

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto mb-10 max-w-4xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
          Timeline
        </p>
        <h1 className="mt-2 font-[var(--font-space)] text-4xl font-semibold text-white">
          Incidents and releases in context
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          Each item shows the incident date separately from the official release
          date, because many UAP records become public long after the event.
        </p>
      </div>
      <TimelineView cases={cases} />
    </main>
  );
}
