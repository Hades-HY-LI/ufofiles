"use client";

import { useState } from "react";

type MediaEmbedProps = {
  src: string;
  title: string;
  type: "document" | "image" | "video";
  fallback: React.ReactNode;
};

export function MediaEmbed({ src, title, type, fallback }: MediaEmbedProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return <>{fallback}</>;

  if (type === "video") {
    return (
      <video
        src={src}
        controls
        onError={() => setFailed(true)}
        className="w-full rounded-lg border border-white/10 bg-black"
      />
    );
  }

  if (type === "document") {
    return (
      <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/70 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-950/90 px-4 py-3">
          <span className="line-clamp-1 text-sm font-semibold text-slate-200">
            {title}
          </span>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-300/20"
          >
            Open PDF
          </a>
        </div>
        <iframe
          src={src}
          title={title}
          onError={() => setFailed(true)}
          className="h-[42rem] w-full bg-slate-950"
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/70">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={title}
        onError={() => setFailed(true)}
        className="max-h-[32rem] w-full object-contain"
      />
    </div>
  );
}
