import { ExternalLink, FileText, Image as ImageIcon, Video, Volume2 } from "lucide-react";
import type { CaseRecord } from "@/lib/types";
import { getOfficialMediaHref, getOfficialSourceHref } from "@/lib/source-links";
import { MediaEmbed } from "@/components/MediaEmbed";

type MediaViewerProps = {
  caseRecord: CaseRecord;
};

export function MediaViewer({ caseRecord }: MediaViewerProps) {
  if (caseRecord.mediaUrl && caseRecord.type === "document") {
    return (
      <MediaEmbed
        src={caseRecord.mediaUrl}
        title={caseRecord.title}
        type="document"
        fallback={
          <UnavailableMediaPanel
            caseRecord={caseRecord}
            message="The official PDF URL is recorded, but the source server did not allow this browser to embed it."
          />
        }
      />
    );
  }

  if (caseRecord.mediaUrl && caseRecord.type === "image") {
    return (
      <MediaEmbed
        src={caseRecord.mediaUrl}
        title={caseRecord.title}
        type="image"
        fallback={
          <UnavailableMediaPanel
            caseRecord={caseRecord}
            message="The official image URL is recorded, but the source server did not allow this browser to embed it."
          />
        }
      />
    );
  }

  if (caseRecord.mediaUrl && caseRecord.type === "video") {
    return (
      <MediaEmbed
        src={caseRecord.mediaUrl}
        title={caseRecord.title}
        type="video"
        fallback={
          <UnavailableMediaPanel
            caseRecord={caseRecord}
            message="The official video URL is recorded, but the source server did not allow this browser to embed it."
          />
        }
      />
    );
  }

  if (caseRecord.mediaUrl && caseRecord.type === "audio") {
    return (
      <MediaEmbed
        src={caseRecord.mediaUrl}
        title={caseRecord.title}
        type="audio"
        fallback={
          <UnavailableMediaPanel
            caseRecord={caseRecord}
            message="The official audio URL is recorded, but the source server did not allow this browser to embed it."
          />
        }
      />
    );
  }

  return <UnavailableMediaPanel caseRecord={caseRecord} />;
}

function UnavailableMediaPanel({
  caseRecord,
  message = "No embeddable media file is available in the local archive for this record yet. Use the official source link to inspect the release."
}: {
  caseRecord: CaseRecord;
  message?: string;
}) {
  const sourceHref = getOfficialSourceHref(caseRecord);
  const mediaHref = getOfficialMediaHref(caseRecord);
  const Icon =
    caseRecord.type === "video"
      ? Video
      : caseRecord.type === "audio"
        ? Volume2
      : caseRecord.type === "image"
        ? ImageIcon
        : FileText;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700">
        <Icon size={26} />
      </div>
      <h2 className="mt-5 font-[var(--font-space)] text-xl font-semibold text-slate-950">
        Media viewer
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
        {message}
      </p>
      {mediaHref ? (
        <a
          href={mediaHref}
          target="_blank"
          rel="noreferrer"
          className="mt-6 mr-2 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
        >
          Open media URL <ExternalLink size={16} />
        </a>
      ) : null}
      <a
        href={sourceHref}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-700"
      >
        Open official source <ExternalLink size={16} />
      </a>
    </div>
  );
}
