import Link from "next/link";
import { Bell, ExternalLink } from "lucide-react";
import { getSyncMetadata } from "@/lib/cases";
import { formatDate } from "@/lib/dates";

export function ReleaseBanner() {
  const metadata = getSyncMetadata();
  const hasUpdates =
    metadata.newRecordCount > 0 || metadata.changedRecordCount > 0;
  const isFresh = metadata.status === "fresh" && !hasUpdates;

  return (
    <div
      className={`border-b px-4 py-2 text-sm ${
        metadata.status === "failed"
          ? "border-red-200 bg-red-50 text-red-900"
          : metadata.status === "stale" || metadata.status === "partial"
            ? "border-amber-200 bg-amber-50 text-amber-950"
            : "border-lime-200 bg-lime-50 text-lime-950"
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Bell size={16} className="shrink-0 text-lime-700" />
          <span>
            {hasUpdates
              ? `${metadata.newRecordCount} new and ${metadata.changedRecordCount} changed official records synced from war.gov/ufo.`
              : isFresh
                ? `Official-source data fresh. Last sync: ${formatDate(
                    metadata.lastSyncedAt.slice(0, 10)
                  )}.`
                : `Official-source monitor ${metadata.status}. Last sync: ${formatDate(
                    metadata.lastSyncedAt.slice(0, 10)
                  )}.`}
          </span>
        </div>
        <Link
          href="/releases"
          className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-950"
        >
          View release tracker <ExternalLink size={14} />
        </Link>
      </div>
    </div>
  );
}
