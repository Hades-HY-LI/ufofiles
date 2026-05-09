"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { useSearchParams } from "next/navigation";
import type { CaseRecord } from "@/lib/types";
import { formatDate } from "@/lib/dates";
import { getMapCases } from "@/lib/map";

type MapViewProps = {
  cases: CaseRecord[];
};

const markerIcon = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border-radius:999px;background:#46d9ff;border:3px solid rgba(255,255,255,.82);box-shadow:0 0 24px rgba(70,217,255,.65);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

export function MapView({ cases }: MapViewProps) {
  const mapCases = useMemo(() => getMapCases(cases), [cases]);
  const searchParams = useSearchParams();
  const requestedCaseId = searchParams.get("case");
  const requestedCase = mapCases.find((item) => item.id === requestedCaseId);
  const [selectedId, setSelectedId] = useState<string | null>(
    requestedCase?.id ?? null
  );
  const selected = mapCases.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (requestedCase) setSelectedId(requestedCase.id);
  }, [requestedCase]);

  return (
    <div className="grid min-h-[calc(100vh-8.5rem)] gap-4 lg:grid-cols-[22rem_1fr]">
      <aside className="z-10 rounded-lg border border-white/10 bg-slate-950/80 p-5 shadow-panel backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
          Coordinate-ready cases
        </p>
        <h1 className="mt-3 font-[var(--font-space)] text-3xl font-semibold text-white">
          Map Explorer
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Showing {mapCases.length} mapped records. {cases.length - mapCases.length} records have unknown coordinates and remain available in Explore.
        </p>
        <div className="mt-5 max-h-[50vh] space-y-2 overflow-auto pr-1 ufo-scrollbar">
          {mapCases.map((caseRecord) => (
            <button
              key={caseRecord.id}
              type="button"
              onClick={() => setSelectedId(caseRecord.id)}
              className={`w-full rounded-md border p-3 text-left transition ${
                selectedId === caseRecord.id
                  ? "border-cyan-300/45 bg-cyan-300/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
            >
              <span className="line-clamp-1 text-sm font-semibold text-white">
                {caseRecord.title}
              </span>
              <span className="mt-1 block text-xs text-slate-400">
                {caseRecord.locationName}
              </span>
            </button>
          ))}
        </div>
        {requestedCaseId && !requestedCase ? (
          <div className="mt-5 rounded-lg border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-50">
            That case does not have coordinates yet, so it cannot be focused on
            the map.
          </div>
        ) : null}
        {selected ? (
          <div className="mt-5 rounded-lg border border-violet-300/25 bg-violet-300/10 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-violet-100">
              Selected case
            </p>
            <h2 className="mt-2 font-[var(--font-space)] text-lg font-semibold text-white">
              {selected.title}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Incident: {formatDate(selected.incidentDate)}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {selected.locationName}
            </p>
            <Link
              href={`/case/${selected.id}`}
              className="mt-4 inline-flex rounded-md bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-200"
            >
              View case
            </Link>
          </div>
        ) : null}
      </aside>
      <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/70 shadow-panel">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          minZoom={2}
          className="h-[42rem] min-h-full w-full"
          scrollWheelZoom
          worldCopyJump
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MapFocus caseRecord={selected} />
          {mapCases.map((caseRecord) => (
            <Marker
              key={caseRecord.id}
              position={[caseRecord.latitude!, caseRecord.longitude!]}
              icon={markerIcon}
              eventHandlers={{
                click: () => setSelectedId(caseRecord.id)
              }}
            >
              <Popup>
                <div className="max-w-56">
                  <strong>{caseRecord.title}</strong>
                  <p>{caseRecord.locationName}</p>
                  <Link href={`/case/${caseRecord.id}`}>View case</Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

function MapFocus({ caseRecord }: { caseRecord: CaseRecord | null }) {
  const map = useMap();

  useEffect(() => {
    if (caseRecord?.latitude === null || caseRecord?.longitude === null) return;
    if (!caseRecord) {
      map.setView([20, 0], 2, { animate: true });
      return;
    }
    map.flyTo([caseRecord.latitude, caseRecord.longitude], 5, {
      animate: true,
      duration: 0.9
    });
  }, [caseRecord, map]);

  return null;
}
