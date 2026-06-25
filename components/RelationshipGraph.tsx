"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  GitBranch,
  Info,
  Maximize2,
  Minus,
  MousePointer2,
  Plus,
  RotateCcw
} from "lucide-react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY
} from "d3-force";
import type { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";
import type { CaseGraph, CaseGraphNode } from "@/lib/relationships";
import type { MediaType } from "@/lib/types";
import { formatDate } from "@/lib/dates";
import { labelMediaType } from "@/lib/filters";
import { clsx } from "@/lib/utils";

type RelationshipGraphProps = {
  graph: CaseGraph;
};

type GraphPoint = {
  x: number;
  y: number;
};

type ForceNode = SimulationNodeDatum &
  CaseGraphNode & {
    clusterX: number;
    clusterY: number;
  };

type ForceLink = SimulationLinkDatum<ForceNode> & {
  source: string;
  target: string;
  score: number;
};

type DragState =
  | {
      type: "pan";
      startX: number;
      startY: number;
      originX: number;
      originY: number;
    }
  | {
      type: "node";
      id: string;
      startX: number;
      startY: number;
      origin: GraphPoint;
    };

const WIDTH = 1160;
const HEIGHT = 720;
const MIN_ZOOM = 0.55;
const MAX_ZOOM = 2.9;

const typeColor: Record<MediaType, string> = {
  document: "#67e8f9",
  image: "#a7f3d0",
  video: "#f0abfc",
  audio: "#fde68a",
  unknown: "#cbd5e1"
};

export function RelationshipGraph({ graph }: RelationshipGraphProps) {
  const releases = useMemo(
    () => [...new Set(graph.nodes.map((node) => node.releaseDate ?? "unknown"))].sort().reverse(),
    [graph.nodes]
  );
  const [release, setRelease] = useState("all");
  const [selectedId, setSelectedId] = useState(
    graph.edges[0]?.source ?? graph.nodes[0]?.id ?? ""
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [manualPositions, setManualPositions] = useState<Record<string, GraphPoint>>({});
  const graphFrameRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef(zoom);
  const offsetRef = useRef(offset);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  const visible = useMemo(() => {
    const nodes =
      release === "all"
        ? graph.nodes
        : graph.nodes.filter((node) => (node.releaseDate ?? "unknown") === release);
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = graph.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
    return { nodes, edges };
  }, [graph, release]);

  const layout = useMemo(() => makeForceLayout(visible), [visible]);
  const points = useMemo(() => {
    const next = new Map(layout);
    Object.entries(manualPositions).forEach(([id, point]) => {
      if (next.has(id)) next.set(id, point);
    });
    return next;
  }, [layout, manualPositions]);
  const nodeById = new Map(visible.nodes.map((node) => [node.id, node]));
  const topLabelIds = new Set<string>();
  const selected =
    visible.nodes.find((node) => node.id === selectedId) ??
    (visible.edges[0] ? nodeById.get(visible.edges[0].source) : null) ??
    visible.nodes[0] ??
    null;
  const selectedEdges = selected
    ? visible.edges
        .filter((edge) => edge.source === selected.id || edge.target === selected.id)
        .sort((left, right) => right.score - left.score)
        .slice(0, 8)
    : [];

  function zoomBy(delta: number) {
    zoomAt(delta, { x: WIDTH / 2, y: HEIGHT / 2 });
  }

  function zoomAt(delta: number, anchor: GraphPoint) {
    const currentZoom = zoomRef.current;
    const nextZoom = clamp(roundPoint(currentZoom + delta), MIN_ZOOM, MAX_ZOOM);
    if (nextZoom === currentZoom) return;

    const currentOffset = offsetRef.current;
    const graphX = (anchor.x - currentOffset.x) / currentZoom;
    const graphY = (anchor.y - currentOffset.y) / currentZoom;
    const nextOffset = {
      x: roundPoint(anchor.x - graphX * nextZoom),
      y: roundPoint(anchor.y - graphY * nextZoom)
    };

    zoomRef.current = nextZoom;
    offsetRef.current = nextOffset;
    setZoom(nextZoom);
    setOffset(nextOffset);
  }

  function resetView() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setManualPositions({});
  }

  useEffect(() => {
    const graphFrame = graphFrameRef.current;
    if (!graphFrame) return;

    const handleGraphWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const svg = graphFrame.querySelector("svg");
      const rect = svg?.getBoundingClientRect();
      const anchor = rect
        ? {
            x: ((event.clientX - rect.left) / rect.width) * WIDTH,
            y: ((event.clientY - rect.top) / rect.height) * HEIGHT
          }
        : { x: WIDTH / 2, y: HEIGHT / 2 };
      zoomAt(event.deltaY > 0 ? -0.12 : 0.12, anchor);
    };

    graphFrame.addEventListener("wheel", handleGraphWheel, { passive: false });
    return () => graphFrame.removeEventListener("wheel", handleGraphWheel);
  }, []);

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!dragState) return;
    if (dragState.type === "pan") {
      setOffset({
        x: dragState.originX + event.clientX - dragState.startX,
        y: dragState.originY + event.clientY - dragState.startY
      });
      return;
    }

    setManualPositions((current) => ({
      ...current,
      [dragState.id]: {
        x: dragState.origin.x + (event.clientX - dragState.startX) / zoom,
        y: dragState.origin.y + (event.clientY - dragState.startY) / zoom
      }
    }));
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <GitBranch size={17} className="text-violet-700" />
            {visible.nodes.length} significant files / {visible.edges.length} relationship links
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setRelease("all")}
              className={pillClass(release === "all")}
            >
              All
            </button>
            {releases.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setRelease(item);
                  resetView();
                }}
                className={pillClass(release === item)}
              >
                {formatDate(item === "unknown" ? null : item)}
              </button>
            ))}
          </div>
        </div>
        <div
          ref={graphFrameRef}
          className="relative h-[42rem] overscroll-contain bg-[radial-gradient(circle_at_50%_45%,rgba(124,58,237,0.10),transparent_23rem)]"
        >
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className={clsx(
              "h-full w-full touch-none select-none",
              dragState?.type === "pan" ? "cursor-grabbing" : "cursor-grab"
            )}
            onPointerMove={handlePointerMove}
            onPointerUp={() => setDragState(null)}
            onPointerLeave={() => setDragState(null)}
            aria-label="Spatial relationship graph"
          >
            <defs>
              <radialGradient id="node-halo" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(124,58,237,.24)" />
                <stop offset="100%" stopColor="rgba(124,58,237,0)" />
              </radialGradient>
            </defs>
            <rect
              width={WIDTH}
              height={HEIGHT}
              fill="transparent"
              onPointerDown={(event) =>
                setDragState({
                  type: "pan",
                  startX: event.clientX,
                  startY: event.clientY,
                  originX: offset.x,
                  originY: offset.y
                })
              }
            />
            <g transform={`translate(${offset.x} ${offset.y}) scale(${zoom})`}>
              <g opacity="0.45">
                {Array.from({ length: 18 }).map((_, index) => (
                  <line
                    key={`grid-x-${index}`}
                    x1={index * 72}
                    x2={index * 72}
                    y1={0}
                    y2={HEIGHT}
                    stroke="rgba(100,116,139,.14)"
                  />
                ))}
                {Array.from({ length: 11 }).map((_, index) => (
                  <line
                    key={`grid-y-${index}`}
                    x1={0}
                    x2={WIDTH}
                    y1={index * 74}
                    y2={index * 74}
                    stroke="rgba(100,116,139,.14)"
                  />
                ))}
              </g>
              <g>
                {visible.edges.map((edge) => {
                  const source = points.get(edge.source);
                  const target = points.get(edge.target);
                  if (!source || !target) return null;
                  const active =
                    selected &&
                    (edge.source === selected.id || edge.target === selected.id);
                  return (
                    <line
                      key={`${edge.source}-${edge.target}`}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={active ? "rgba(124,58,237,.72)" : "rgba(100,116,139,.22)"}
                      strokeWidth={roundPoint(active ? Math.min(5.5, edge.score / 1.8) : Math.max(0.8, edge.score / 4.8))}
                      opacity={active ? 0.9 : clamp(edge.score / 13, 0.24, 0.62)}
                    />
                  );
                })}
              </g>
              <g>
                {visible.nodes.map((node) => {
                  const point = points.get(node.id);
                  if (!point) return null;
                  const radius = nodeRadius(node);
                  const selectedNode = selected?.id === node.id;
                  const showLabel =
                    selectedNode || hoveredId === node.id || topLabelIds.has(node.id);
                  return (
                    <g
                      key={node.id}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer outline-none"
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        setSelectedId(node.id);
                        setDragState({
                          type: "node",
                          id: node.id,
                          startX: event.clientX,
                          startY: event.clientY,
                          origin: point
                        });
                      }}
                      onClick={() => setSelectedId(node.id)}
                      onMouseEnter={() => setHoveredId(node.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") setSelectedId(node.id);
                      }}
                    >
                      <title>{`${node.title} / ${labelMediaType(node.type)} / weight ${node.degree}`}</title>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={selectedNode ? radius * 2.5 : radius * 1.35}
                        fill={selectedNode ? "url(#node-halo)" : "rgba(226,232,240,.5)"}
                      />
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={selectedNode ? radius + 1.2 : radius}
                        fill={typeColor[node.type]}
                        stroke={selectedNode ? "#ffffff" : "rgba(15,23,42,.55)"}
                        strokeWidth={selectedNode ? 2.2 : 1.2}
                        opacity={selectedNode ? 1 : 0.88}
                      />
                      {showLabel ? (
                        <g className="pointer-events-none">
                          <rect
                            x={point.x + radius + 7}
                            y={point.y - 13}
                            width={labelWidth(node.title)}
                            height={24}
                            rx={5}
                            fill="rgba(255,255,255,.94)"
                            stroke="rgba(203,213,225,.95)"
                          />
                          <text
                            x={point.x + radius + 15}
                            y={point.y + 4}
                            className="select-none fill-slate-900 text-[13px] font-semibold"
                          >
                            {truncateNodeTitle(node.title)}
                          </text>
                        </g>
                      ) : null}
                    </g>
                  );
                })}
              </g>
            </g>
          </svg>
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-md border border-slate-200 bg-white/90 p-1 shadow-sm backdrop-blur">
            <IconButton label="Zoom in" onClick={() => zoomBy(0.18)}>
              <Plus size={15} />
            </IconButton>
            <IconButton label="Zoom out" onClick={() => zoomBy(-0.18)}>
              <Minus size={15} />
            </IconButton>
            <IconButton label="Reset graph view" onClick={resetView}>
              <RotateCcw size={15} />
            </IconButton>
            <span className="px-2 text-xs tabular-nums text-slate-600">
              {Math.round(zoom * 100)}%
            </span>
          </div>
          <div className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white/88 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur">
            <MousePointer2 size={14} className="text-violet-700" />
            Drag canvas to pan, scroll to zoom, drag a file to inspect clusters.
          </div>
          <div className="pointer-events-none absolute bottom-4 left-4 flex max-w-[32rem] flex-wrap gap-2 text-xs text-slate-600">
            {Object.entries(typeColor).map(([type, color]) => (
              <span key={type} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white/88 px-2 py-1 shadow-sm backdrop-blur">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                {labelMediaType(type as MediaType)}
              </span>
            ))}
          </div>
          <div className="pointer-events-none absolute bottom-4 right-4 rounded-md border border-slate-200 bg-white/88 p-3 text-xs text-slate-600 shadow-sm backdrop-blur">
            <div className="font-semibold text-slate-950">Relationship strength</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="h-px w-12 bg-slate-400" />
              Lower score
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="h-1.5 w-12 rounded bg-violet-500" />
              Higher score
            </div>
          </div>
        </div>
      </section>

      <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        {selected ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
                  Selected file
                </p>
                <h2 className="mt-2 font-[var(--font-space)] text-xl font-semibold leading-tight text-slate-950">
                  {selected.title}
                </h2>
              </div>
              <span
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600"
                title="Graph prominence score, normalized from 0 to 100 based on archive-computed relationship strength."
              >
                Prominence {selected.significance}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Meta label="Release" value={formatDate(selected.releaseDate)} />
              <Meta label="Type" value={labelMediaType(selected.type)} />
              <Meta label="Agency" value={selected.agency} />
              <WeightMeta value={String(selected.degree)} />
            </dl>
            <Link
              href={`/case/${selected.id}`}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Open case <Maximize2 size={16} />
            </Link>
            <h3 className="mt-7 text-sm font-semibold text-slate-950">
              Strongest archive-computed relationships
            </h3>
            <div className="mt-3 space-y-3">
              {selectedEdges.map((edge) => {
                const relatedId = edge.source === selected.id ? edge.target : edge.source;
                const related = nodeById.get(relatedId);
                if (!related) return null;
                return (
                  <Link
                    key={`${edge.source}-${edge.target}`}
                    href={`/case/${related.id}`}
                    className="block rounded-md border border-slate-200 bg-slate-50 p-3 transition hover:border-violet-200 hover:bg-violet-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="line-clamp-2 text-sm font-semibold text-slate-950">
                        {related.title}
                      </span>
                      <span className="rounded bg-violet-100 px-1.5 py-0.5 text-xs font-semibold text-violet-700">
                        {edge.score}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">
                      {edge.reasons.map(formatRelationshipReason).join(" / ")}
                    </p>
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">No graph nodes are available yet.</p>
        )}
      </aside>
    </div>
  );
}

function formatRelationshipReason(reason: string) {
  if (reason.startsWith("same release date ")) {
    return `Same release: ${formatDate(reason.replace("same release date ", ""))}`;
  }
  if (reason.startsWith("same agency ")) {
    return `Same agency: ${reason.replace("same agency ", "")}`;
  }
  if (reason.startsWith("same media type ")) {
    return `Same media type: ${labelMediaType(reason.replace("same media type ", "") as MediaType)}`;
  }
  if (reason.startsWith("shared tags: ")) {
    return `Shared tags: ${reason.replace("shared tags: ", "")}`;
  }
  if (reason.startsWith("shared terms: ")) {
    return `Shared title/summary terms: ${reason.replace("shared terms: ", "")}`;
  }
  return reason;
}

function truncateNodeTitle(title: string) {
  return title.length > 28 ? `${title.slice(0, 25)}...` : title;
}

function labelWidth(title: string) {
  return Math.min(245, truncateNodeTitle(title).length * 7.2 + 18);
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-800">{value}</dd>
    </div>
  );
}

function WeightMeta({ value }: { value: string }) {
  return (
    <div className="relative rounded-md border border-slate-200 bg-slate-50 p-3">
      <dt className="flex items-start justify-between gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        <span>Relationship weight</span>
        <span
          className="relationship-weight-info relative inline-flex"
        >
          <button
            type="button"
            aria-label="How relationship weight is calculated"
            aria-describedby="relationship-weight-help"
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 outline-none transition hover:border-violet-300 hover:text-violet-700 focus:border-violet-400 focus:text-violet-700"
          >
            <Info size={12} />
          </button>
          <span className="relationship-weight-bridge absolute right-0 top-5 h-3 w-80" />
          <span
            id="relationship-weight-help"
            className="relationship-weight-tooltip pointer-events-auto absolute right-0 top-8 z-20 w-80 rounded-md border border-violet-200 bg-white p-3 text-xs normal-case leading-5 tracking-normal text-slate-600 shadow-lg backdrop-blur"
          >
            Relationship weight is the sum of this file&apos;s visible and hidden
            archive-computed relationship scores. Each pair can score for same
            release, agency, media type, shared tags, and recurring title or
            summary terms. It is a navigation signal, not an official claim.
          </span>
        </span>
      </dt>
      <dd className="mt-1 text-slate-800">{value}</dd>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 transition hover:border-violet-300 hover:text-violet-700"
    >
      {children}
    </button>
  );
}

function makeForceLayout(graph: Pick<CaseGraph, "nodes" | "edges">) {
  const releases = [...new Set(graph.nodes.map((node) => node.releaseDate ?? "unknown"))].sort();
  const releaseIndex = new Map(releases.map((release, index) => [release, index]));
  const nodes: ForceNode[] = graph.nodes.map((node) => {
    const cluster = releaseIndex.get(node.releaseDate ?? "unknown") ?? 0;
    const clusterX =
      releases.length <= 1
        ? WIDTH / 2
        : 260 + ((WIDTH - 520) * cluster) / Math.max(1, releases.length - 1);
    const clusterY = HEIGHT / 2;
    const seed = seededPoint(node.id);
    return {
      ...node,
      x: clusterX + (seed.x - 0.5) * 420,
      y: clusterY + (seed.y - 0.5) * 440,
      clusterX,
      clusterY
    };
  });
  const links: ForceLink[] = graph.edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
    score: edge.score
  }));

  forceSimulation(nodes)
    .force(
      "link",
      forceLink<ForceNode, ForceLink>(links)
        .id((node) => node.id)
        .distance((link) => Math.max(175, 340 - link.score * 7.5))
        .strength((link) => clamp(link.score / 34, 0.06, 0.28))
    )
    .force("charge", forceManyBody<ForceNode>().strength((node) => -340 - node.significance * 3.8))
    .force("collide", forceCollide<ForceNode>().radius((node) => nodeRadius(node) + 46).iterations(5))
    .force("center", forceCenter(WIDTH / 2, HEIGHT / 2))
    .force("x", forceX<ForceNode>((node) => node.clusterX).strength(0.028))
    .force("y", forceY<ForceNode>((node) => node.clusterY).strength(0.03))
    .stop()
    .tick(340);

  return fitLayout(nodes);
}

function fitLayout(nodes: ForceNode[]) {
  const layout = new Map<string, GraphPoint>();
  if (!nodes.length) return layout;

  const minX = Math.min(...nodes.map((node) => node.x ?? 0));
  const maxX = Math.max(...nodes.map((node) => node.x ?? 0));
  const minY = Math.min(...nodes.map((node) => node.y ?? 0));
  const maxY = Math.max(...nodes.map((node) => node.y ?? 0));
  const margin = 84;
  const scale = Math.min(
    (WIDTH - margin * 2) / Math.max(1, maxX - minX),
    (HEIGHT - margin * 2) / Math.max(1, maxY - minY),
    1.35
  );

  nodes.forEach((node) => {
    layout.set(node.id, {
      x: roundPoint(margin + ((node.x ?? 0) - minX) * scale),
      y: roundPoint(margin + ((node.y ?? 0) - minY) * scale)
    });
  });

  return layout;
}

function seededPoint(value: string) {
  const hash = stableHash(value);
  return {
    x: ((hash & 0xffff) / 0xffff),
    y: (((hash >>> 16) & 0xffff) / 0xffff)
  };
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nodeRadius(node: Pick<CaseGraphNode, "significance" | "degree">) {
  return roundPoint(
    2.6 +
      Math.sqrt(Math.max(1, node.significance)) * 0.24 +
      Math.min(1, node.degree / 360)
  );
}

function roundPoint(value: number) {
  return Number(value.toFixed(3));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pillClass(active: boolean) {
  return clsx(
    "whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-semibold transition",
    active
      ? "border-violet-200 bg-violet-600 text-white"
      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"
  );
}
