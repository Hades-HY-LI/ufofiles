"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import Link from "next/link";
import { Crosshair, FileQuestion, Layers3, Minus, Plus, RotateCcw, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { CaseRecord, MediaType } from "@/lib/types";
import { formatDate } from "@/lib/dates";
import { labelMediaType } from "@/lib/filters";
import { getMapCases } from "@/lib/map";
import { getOfficialSourceHref } from "@/lib/source-links";
import { clsx } from "@/lib/utils";

type MapViewProps = {
  cases: CaseRecord[];
};

type MapCenter = {
  latitude: number;
  longitude: number;
};

const TILE_SIZE = 256;
const MIN_ZOOM = 2;
const MAX_ZOOM = 8;

export function MapView({ cases }: MapViewProps) {
  const searchParams = useSearchParams();
  const requestedCaseId = searchParams.get("case");
  const [query, setQuery] = useState("");
  const [type, setType] = useState<MediaType | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(requestedCaseId);
  const [zoom, setZoom] = useState(3);
  const [center, setCenter] = useState<MapCenter>({ latitude: 24, longitude: 28 });
  const [viewport, setViewport] = useState({ width: 720, height: 704 });
  const [isMounted, setIsMounted] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const centerRef = useRef(center);
  const viewportRef = useRef(viewport);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    centerPoint: { x: number; y: number };
    moved: boolean;
  } | null>(null);

  const filteredCases = useMemo(
    () => filterMapCases(cases, query, type),
    [cases, query, type]
  );
  const mapCases = useMemo(() => getMapCases(filteredCases), [filteredCases]);
  const unmappedCases = filteredCases.filter(
    (item) => item.latitude === null || item.longitude === null
  );
  const requestedCase = cases.find((item) => item.id === requestedCaseId) ?? null;
  const selected =
    filteredCases.find((item) => item.id === selectedId) ??
    requestedCase ??
    mapCases[0] ??
    null;
  const defaultCenter = useMemo(() => computeMapCenter(mapCases), [mapCases]);
  const tiles = useMemo(
    () => visibleTiles(center, zoom, viewport.width, viewport.height),
    [center, viewport.height, viewport.width, zoom]
  );

  useEffect(() => {
    if (requestedCaseId) setSelectedId(requestedCaseId);
  }, [requestedCaseId]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    centerRef.current = center;
  }, [center]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    if (!requestedCaseId) setCenter(defaultCenter);
  }, [defaultCenter, requestedCaseId]);

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewport({
        width: Math.max(320, entry.contentRect.width),
        height: Math.max(320, entry.contentRect.height)
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = element.getBoundingClientRect();
      zoomAt(event.deltaY < 0 ? 1 : -1, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, []);

  const selectCase = (caseRecord: CaseRecord) => {
    setSelectedId(caseRecord.id);
    if (caseRecord.latitude !== null && caseRecord.longitude !== null) {
      setCenter({ latitude: caseRecord.latitude, longitude: caseRecord.longitude });
    }
  };

  const changeZoom = (delta: number) => {
    zoomAt(delta, {
      x: viewportRef.current.width / 2,
      y: viewportRef.current.height / 2
    });
  };

  const zoomAt = (delta: number, anchor: { x: number; y: number }) => {
    setZoom((currentZoom) => {
      const nextZoom = clamp(currentZoom + delta, MIN_ZOOM, MAX_ZOOM);
      if (nextZoom === currentZoom) return currentZoom;

      const currentViewport = viewportRef.current;
      const currentCenter = centerRef.current;
      const currentCenterPoint = projectMercator(
        currentCenter.latitude,
        currentCenter.longitude,
        currentZoom
      );
      const anchoredWorldPoint = {
        x: currentCenterPoint.x + anchor.x - currentViewport.width / 2,
        y: currentCenterPoint.y + anchor.y - currentViewport.height / 2
      };
      const anchoredGeo = unprojectMercator(
        anchoredWorldPoint.x,
        anchoredWorldPoint.y,
        currentZoom
      );
      const nextAnchoredPoint = projectMercator(
        anchoredGeo.latitude,
        anchoredGeo.longitude,
        nextZoom
      );
      const nextCenter = unprojectMercator(
        nextAnchoredPoint.x - anchor.x + currentViewport.width / 2,
        nextAnchoredPoint.y - anchor.y + currentViewport.height / 2,
        nextZoom
      );

      centerRef.current = nextCenter;
      setCenter(nextCenter);
      return nextZoom;
    });
  };

  const resetView = () => {
    setZoom(3);
    setCenter(defaultCenter);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      centerPoint: projectMercator(center.latitude, center.longitude, zoom),
      moved: false
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    drag.moved = drag.moved || Math.abs(deltaX) + Math.abs(deltaY) > 4;
    setCenter(
      unprojectMercator(
        drag.centerPoint.x - deltaX,
        drag.centerPoint.y - deltaY,
        zoom
      )
    );
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  return (
    <div className="grid min-h-[calc(100vh-8rem)] gap-4 xl:grid-cols-[22rem_1fr_20rem]">
      <aside className="z-10 rounded-lg border border-slate-200 bg-white p-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
          <Layers3 size={17} className="text-teal-700" />
          Map controls
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {mapCases.length} mapped records, {unmappedCases.length} records
          without coordinates.
        </p>

        <label className="mt-5 block">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Search
          </span>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <Search size={15} className="text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Title, agency, location"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
            />
          </div>
        </label>

        <div className="mt-5">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Type
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["all", "document", "image", "video", "audio"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setType(item)}
                className={clsx(
                  "rounded-md border px-3 py-2 text-sm transition",
                  type === item
                    ? "border-teal-200 bg-teal-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                )}
              >
                {item === "all" ? "All" : labelMediaType(item)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 max-h-[38vh] space-y-2 overflow-auto pr-1 ufo-scrollbar">
          {mapCases.map((caseRecord) => (
            <CaseFocusButton
              key={caseRecord.id}
              caseRecord={caseRecord}
              selected={selected?.id === caseRecord.id}
              onClick={() => setSelectedId(caseRecord.id)}
            />
          ))}
        </div>
      </aside>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h1 className="font-[var(--font-space)] text-xl font-semibold text-slate-950">
              Map Explorer
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Coordinate-bearing official records with live focus and source links.
            </p>
          </div>
          {selected?.latitude !== null && selected?.longitude !== null ? (
            <span className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <Crosshair size={14} />
              Focus ready
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700">
              <FileQuestion size={14} />
              No coordinates
            </span>
          )}
        </div>
        <div
          data-testid="map-viewport"
          className="relative h-[44rem] touch-none overflow-hidden bg-[#050812]"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          ref={mapRef}
        >
          <div className="absolute inset-0 cursor-grab bg-[#dbe7e8] active:cursor-grabbing">
            {isMounted ? tiles.map((tile) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={tile.key}
                src={tileUrl(tile.z, tile.x, tile.y)}
                alt=""
                draggable={false}
                className="absolute h-64 w-64 select-none"
                style={{
                  left: tile.left,
                  top: tile.top
                }}
              />
            )) : null}
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.08)_1px,transparent_1px)] bg-[size:96px_96px] mix-blend-multiply" />
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_45%,transparent_0_38%,rgba(2,6,23,.18)_74%,rgba(2,6,23,.32)_100%)]" />
          <div className="absolute inset-0">
            {isMounted ? mapCases.map((caseRecord) => {
              const point = screenPoint(caseRecord.latitude!, caseRecord.longitude!, center, zoom, viewport);
              const isSelected = selected?.id === caseRecord.id;
              return (
                <button
                  key={caseRecord.id}
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => selectCase(caseRecord)}
                  data-testid={`map-marker-${caseRecord.id}`}
                  className={clsx(
                    "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition",
                    isSelected
                      ? "z-30 h-7 w-7 border-white bg-cyan-300 shadow-[0_0_0_7px_rgba(8,145,178,.22),0_8px_24px_rgba(14,116,144,.45)]"
                      : "z-20 h-5 w-5 border-white bg-rose-500 shadow-[0_0_0_5px_rgba(244,63,94,.18),0_4px_18px_rgba(159,18,57,.36)] hover:h-6 hover:w-6 hover:bg-cyan-300"
                  )}
                  style={{ left: point.x, top: point.y }}
                  aria-label={caseRecord.title}
                />
              );
            }) : null}
          </div>
          <div className="absolute right-4 top-4 flex overflow-hidden rounded-md border border-slate-200 bg-white/95 shadow-lg backdrop-blur">
            <button
              type="button"
              onClick={() => changeZoom(1)}
              onPointerDown={(event) => event.stopPropagation()}
              className="flex h-10 w-10 items-center justify-center border-r border-slate-200 text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in"
            >
              <Plus size={17} />
            </button>
            <button
              type="button"
              onClick={() => changeZoom(-1)}
              onPointerDown={(event) => event.stopPropagation()}
              className="flex h-10 w-10 items-center justify-center border-r border-slate-200 text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
            >
              <Minus size={17} />
            </button>
            <button
              type="button"
              onClick={resetView}
              onPointerDown={(event) => event.stopPropagation()}
              className="flex h-10 w-10 items-center justify-center text-slate-700 transition hover:bg-slate-100"
              aria-label="Reset map view"
            >
              <RotateCcw size={16} />
            </button>
          </div>
          <div className="absolute left-4 top-4 rounded-md border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
            Zoom {zoom} / drag to pan
          </div>
          <div className="absolute bottom-4 left-4 rounded-md border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur">
            Map tiles provide geographic context. Case coordinates are approximate.
          </div>
          <a
            href="https://carto.com/attributions"
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-4 right-4 rounded bg-white/85 px-2 py-1 text-[10px] text-slate-500"
            onPointerDown={(event) => event.stopPropagation()}
          >
            CARTO / OpenStreetMap
          </a>
        </div>
      </section>

      <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <SelectedMapCase caseRecord={selected} />
        <div className="mt-5 border-t border-slate-200 pt-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-950">
              Unmapped records
            </h2>
            <span className="text-xs text-slate-500">{unmappedCases.length}</span>
          </div>
          <div className="mt-3 max-h-[27rem] space-y-2 overflow-auto pr-1 ufo-scrollbar">
            {unmappedCases.slice(0, 40).map((caseRecord) => (
              <Link
                key={caseRecord.id}
                href={`/case/${caseRecord.id}`}
                className="block rounded-md border border-slate-200 bg-slate-50 p-3 transition hover:border-teal-200 hover:bg-teal-50"
              >
                <span className="line-clamp-2 text-sm font-semibold text-slate-950">
                  {caseRecord.title}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {formatDate(caseRecord.releaseDate)} / {labelMediaType(caseRecord.type)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function CaseFocusButton({
  caseRecord,
  selected,
  onClick
}: {
  caseRecord: CaseRecord;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "w-full rounded-md border p-3 text-left transition",
        selected
          ? "border-teal-300 bg-teal-50"
          : "border-slate-200 bg-white hover:bg-slate-50"
      )}
    >
      <span className="line-clamp-1 text-sm font-semibold text-slate-950">
        {caseRecord.title}
      </span>
      <span className="mt-1 block text-xs text-slate-500">
        {caseRecord.locationName} / {formatDate(caseRecord.releaseDate)}
      </span>
    </button>
  );
}

function SelectedMapCase({ caseRecord }: { caseRecord: CaseRecord | null }) {
  if (!caseRecord) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Select a mapped record to inspect source and coordinate details.
      </div>
    );
  }

  const sourceHref = getOfficialSourceHref(caseRecord);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
        Selected case
      </p>
      <h2 className="mt-2 font-[var(--font-space)] text-xl font-semibold leading-tight text-slate-950">
        {caseRecord.title}
      </h2>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <MapMeta label="Release" value={formatDate(caseRecord.releaseDate)} />
        <MapMeta label="Type" value={labelMediaType(caseRecord.type)} />
        <MapMeta label="Agency" value={caseRecord.agency} />
        <MapMeta
          label="Coordinates"
          value={
            caseRecord.latitude !== null && caseRecord.longitude !== null
              ? `${caseRecord.latitude.toFixed(2)}, ${caseRecord.longitude.toFixed(2)}`
              : "Unknown"
          }
        />
      </dl>
      <p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-600">
        {caseRecord.summary}
      </p>
      <div className="mt-5 grid gap-2">
        <Link
          href={`/case/${caseRecord.id}`}
          className="rounded-md bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-blue-700"
        >
          Open case
        </Link>
        <a
          href={sourceHref}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-center text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
        >
          Official source
        </a>
      </div>
    </div>
  );
}

function MapMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</dt>
      <dd className="mt-1 line-clamp-2 text-slate-800">{value}</dd>
    </div>
  );
}

function filterMapCases(
  cases: CaseRecord[],
  query: string,
  type: MediaType | "all"
) {
  const needle = query.trim().toLowerCase();
  return cases.filter((caseRecord) => {
    const haystack = `${caseRecord.title} ${caseRecord.summary} ${caseRecord.agency} ${caseRecord.locationName} ${caseRecord.tags.join(" ")}`.toLowerCase();
    return (
      (type === "all" || caseRecord.type === type) &&
      (!needle || haystack.includes(needle))
    );
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function computeMapCenter(cases: CaseRecord[]): MapCenter {
  const mapped = cases.filter(
    (caseRecord) => caseRecord.latitude !== null && caseRecord.longitude !== null
  );
  if (!mapped.length) return { latitude: 24, longitude: 28 };
  const latitude =
    mapped.reduce((sum, caseRecord) => sum + caseRecord.latitude!, 0) / mapped.length;
  const longitude =
    mapped.reduce((sum, caseRecord) => sum + caseRecord.longitude!, 0) /
    mapped.length;
  return { latitude, longitude };
}

function visibleTiles(
  center: MapCenter,
  zoom: number,
  width: number,
  height: number
) {
  const centerPoint = projectMercator(center.latitude, center.longitude, zoom);
  const minTileX = Math.floor((centerPoint.x - width / 2) / TILE_SIZE) - 1;
  const maxTileX = Math.floor((centerPoint.x + width / 2) / TILE_SIZE) + 1;
  const minTileY = Math.floor((centerPoint.y - height / 2) / TILE_SIZE) - 1;
  const maxTileY = Math.floor((centerPoint.y + height / 2) / TILE_SIZE) + 1;
  const tileCount = 2 ** zoom;
  const tiles: Array<{
    key: string;
    x: number;
    y: number;
    z: number;
    left: number;
    top: number;
  }> = [];

  for (let x = minTileX; x <= maxTileX; x += 1) {
    for (let y = minTileY; y <= maxTileY; y += 1) {
      if (y < 0 || y >= tileCount) continue;
      const wrappedX = ((x % tileCount) + tileCount) % tileCount;
      tiles.push({
        key: `${zoom}-${x}-${y}`,
        x: wrappedX,
        y,
        z: zoom,
        left: x * TILE_SIZE - centerPoint.x + width / 2,
        top: y * TILE_SIZE - centerPoint.y + height / 2
      });
    }
  }

  return tiles;
}

function screenPoint(
  latitude: number,
  longitude: number,
  center: MapCenter,
  zoom: number,
  viewport: { width: number; height: number }
) {
  const point = projectMercator(latitude, longitude, zoom);
  const centerPoint = projectMercator(center.latitude, center.longitude, zoom);
  return {
    x: point.x - centerPoint.x + viewport.width / 2,
    y: point.y - centerPoint.y + viewport.height / 2
  };
}

function projectMercator(latitude: number, longitude: number, zoom: number) {
  const sinLatitude = Math.sin((clamp(latitude, -85.05112878, 85.05112878) * Math.PI) / 180);
  const scale = TILE_SIZE * 2 ** zoom;
  return {
    x: ((longitude + 180) / 360) * scale,
    y:
      (0.5 -
        Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) *
      scale
  };
}

function unprojectMercator(x: number, y: number, zoom: number): MapCenter {
  const scale = TILE_SIZE * 2 ** zoom;
  const longitude = (x / scale) * 360 - 180;
  const mercatorY = Math.PI - (2 * Math.PI * y) / scale;
  const latitude = (180 / Math.PI) * Math.atan(Math.sinh(mercatorY));
  return {
    latitude: clamp(latitude, -85.05112878, 85.05112878),
    longitude: ((((longitude + 180) % 360) + 360) % 360) - 180
  };
}

function tileUrl(zoom: number, x: number, y: number) {
  const subdomain = ["a", "b", "c"][(x + y) % 3];
  return `https://${subdomain}.basemaps.cartocdn.com/light_all/${zoom}/${x}/${y}.png`;
}
