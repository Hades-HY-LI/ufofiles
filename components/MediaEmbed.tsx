"use client";

import { useState } from "react";

type MediaEmbedProps = {
  src: string;
  title: string;
  type: "document" | "image" | "video" | "audio";
  fallback: React.ReactNode;
};

export function MediaEmbed({ src, title, type, fallback }: MediaEmbedProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return <>{fallback}</>;

  if (type === "video") {
    if (/dvidshub\.net\/video\/embed\//i.test(src)) {
      return (
        <iframe
          src={src}
          title={title}
          onError={() => setFailed(true)}
          allow="fullscreen; encrypted-media"
          className="aspect-video w-full rounded-lg border border-slate-200 bg-black shadow-sm"
        />
      );
    }

    return (
      <video
        src={src}
        controls
        onError={() => setFailed(true)}
        className="w-full rounded-lg border border-slate-200 bg-black shadow-sm"
      />
    );
  }

  if (type === "audio") {
    if (/dvidshub\.net\/audio\/embed\//i.test(src)) {
      return (
        <iframe
          src={src}
          title={title}
          onError={() => setFailed(true)}
          className="h-48 w-full rounded-lg border border-slate-200 bg-white shadow-sm"
        />
      );
    }

    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 line-clamp-2 text-sm font-semibold text-slate-900">
          {title}
        </p>
        <audio src={src} controls onError={() => setFailed(true)} className="w-full" />
      </div>
    );
  }

  if (type === "document") {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <span className="line-clamp-1 text-sm font-semibold text-slate-900">
            {title}
          </span>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
          >
            Open PDF
          </a>
        </div>
        <iframe
          src={src}
          title={title}
          onError={() => setFailed(true)}
          className="h-[42rem] w-full bg-white"
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
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
