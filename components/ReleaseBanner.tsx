import Link from "next/link";
import { Bell, ExternalLink } from "lucide-react";
import { getSyncMetadata } from "@/lib/cases";
import { formatDate } from "@/lib/dates";

export function ReleaseBanner() {
  const metadata = getSyncMetadata();
  const hasUpdates =
    metadata.newRecordCount > 0 || metadata.changedRecordCount > 0;
  const isFresh = metadata.status === "fresh" && !hasUpdates;
  const lastSuccessfulAt = metadata.lastSuccessfulAt ?? metadata.lastSyncedAt;
  const lastAttemptedAt = metadata.lastAttemptedAt ?? metadata.lastSyncedAt;
  const healthMessage =
    metadata.status === "partial"
      ? `Official-source sync partial; some records may be missing. Last attempt: ${formatDate(
          lastAttemptedAt.slice(0, 10)
        )}. Last successful sync: ${formatDate(lastSuccessfulAt.slice(0, 10))}.`
      : metadata.status === "failed"
        ? `Official-source sync failed. Last attempt: ${formatDate(
            lastAttemptedAt.slice(0, 10)
          )}. Last successful sync: ${formatDate(lastSuccessfulAt.slice(0, 10))}.`
        : `Official-source monitor ${metadata.status}. Last successful sync: ${formatDate(
            lastSuccessfulAt.slice(0, 10)
          )}.`;

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
          <Bell
            size={16}
            className={`shrink-0 ${
              metadata.status === "failed"
                ? "text-red-700"
                : metadata.status === "partial" || metadata.status === "stale"
                  ? "text-amber-700"
                  : "text-lime-700"
            }`}
          />
          <span>
            {metadata.status !== "fresh"
              ? healthMessage
              : hasUpdates
                ? `${metadata.newRecordCount} new and ${metadata.changedRecordCount} changed official records synced from war.gov/ufo.`
                : isFresh
                ? `Official-source data fresh. Last sync: ${formatDate(
                    lastSuccessfulAt.slice(0, 10)
                  )}.`
                : healthMessage}
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
