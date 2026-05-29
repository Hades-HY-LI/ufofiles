import type { CaseRecord } from "@/lib/types";

export type CaseGraphNode = {
  id: string;
  title: string;
  type: CaseRecord["type"];
  agency: string;
  releaseDate: string | null;
  significance: number;
  degree: number;
};

export type CaseGraphEdge = {
  source: string;
  target: string;
  score: number;
  reasons: string[];
};

export type CaseGraph = {
  nodes: CaseGraphNode[];
  edges: CaseGraphEdge[];
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "bundle",
  "case",
  "concerning",
  "department",
  "document",
  "dod",
  "file",
  "from",
  "gov",
  "government",
  "includes",
  "official",
  "pursue",
  "record",
  "records",
  "release",
  "section",
  "source",
  "that",
  "the",
  "this",
  "uap",
  "ufo",
  "video",
  "with"
]);

export function buildCaseGraph(
  cases: CaseRecord[],
  options: { maxNodes?: number; maxEdges?: number } = {}
): CaseGraph {
  const maxNodes = options.maxNodes ?? 96;
  const maxEdges = options.maxEdges ?? 180;
  const features = new Map(cases.map((item) => [item.id, caseFeatures(item)]));
  const degree = new Map<string, number>();
  const edges: CaseGraphEdge[] = [];

  for (let leftIndex = 0; leftIndex < cases.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < cases.length; rightIndex += 1) {
      const left = cases[leftIndex];
      const right = cases[rightIndex];
      const edge = scoreRelationship(left, right, features.get(left.id)!, features.get(right.id)!);
      if (!edge) continue;
      edges.push(edge);
      degree.set(left.id, (degree.get(left.id) ?? 0) + edge.score);
      degree.set(right.id, (degree.get(right.id) ?? 0) + edge.score);
    }
  }

  const rankedCases = cases
    .map((item) => ({
      caseRecord: item,
      score:
        (degree.get(item.id) ?? 0) +
        (item.releaseDate === newestReleaseDate(cases) ? 8 : 0) +
        (item.tags.includes("bundle") ? 5 : 0)
    }))
    .sort((left, right) => right.score - left.score);
  const selectedIds = selectBalancedNodes(rankedCases, maxNodes);

  const selectedEdges = edges
    .filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target))
    .sort((left, right) => right.score - left.score)
    .slice(0, maxEdges);

  const nodes = cases
    .filter((item) => selectedIds.has(item.id))
    .map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      agency: item.agency,
      releaseDate: item.releaseDate,
      degree: Number((degree.get(item.id) ?? 0).toFixed(1)),
      significance: Number(
        Math.min(100, Math.round((degree.get(item.id) ?? 0) / 6) + (item.tags.includes("bundle") ? 16 : 0))
      )
    }))
    .sort((left, right) => right.significance - left.significance);

  return { nodes, edges: selectedEdges };
}

function scoreRelationship(
  left: CaseRecord,
  right: CaseRecord,
  leftFeatures: Set<string>,
  rightFeatures: Set<string>
): CaseGraphEdge | null {
  let score = 0;
  const reasons: string[] = [];

  if (left.releaseDate && left.releaseDate === right.releaseDate) {
    score += 3;
    reasons.push(`same release date ${left.releaseDate}`);
  }
  if (left.agency === right.agency && left.agency !== "Unknown agency") {
    score += 2;
    reasons.push(`same agency ${left.agency}`);
  }
  if (left.type === right.type) {
    score += 1.5;
    reasons.push(`same media type ${left.type}`);
  }

  const sharedTags = left.tags.filter((tag) => right.tags.includes(tag) && !["official", "uap", "pursue"].includes(tag));
  if (sharedTags.length) {
    score += Math.min(4, sharedTags.length * 1.2);
    reasons.push(`shared tags: ${sharedTags.slice(0, 3).join(", ")}`);
  }

  const sharedTokens = [...leftFeatures].filter((token) => rightFeatures.has(token));
  if (sharedTokens.length) {
    score += Math.min(6, sharedTokens.length * 0.8);
    reasons.push(`shared terms: ${sharedTokens.slice(0, 4).join(", ")}`);
  }

  if (score < 5) return null;

  return {
    source: left.id,
    target: right.id,
    score: Number(score.toFixed(1)),
    reasons
  };
}

function caseFeatures(caseRecord: CaseRecord) {
  return new Set([
    ...tokens(caseRecord.title),
    ...tokens(caseRecord.summary),
    ...caseRecord.tags.filter((tag) => !["official", "uap", "pursue"].includes(tag))
  ]);
}

function selectBalancedNodes(
  rankedCases: Array<{ caseRecord: CaseRecord; score: number }>,
  maxNodes: number
) {
  const selectedIds = new Set<string>();
  const releaseDates = [
    ...new Set(rankedCases.map((item) => item.caseRecord.releaseDate ?? "unknown"))
  ];
  const perReleaseMinimum = Math.min(24, Math.max(8, Math.floor(maxNodes / Math.max(1, releaseDates.length * 2))));

  for (const releaseDate of releaseDates) {
    rankedCases
      .filter(
        (item) =>
          (item.caseRecord.releaseDate ?? "unknown") === releaseDate &&
          item.caseRecord.tags.includes("bundle")
      )
      .forEach((item) => selectedIds.add(item.caseRecord.id));
    rankedCases
      .filter((item) => (item.caseRecord.releaseDate ?? "unknown") === releaseDate)
      .slice(0, perReleaseMinimum)
      .forEach((item) => selectedIds.add(item.caseRecord.id));
  }

  for (const item of rankedCases) {
    if (selectedIds.size >= maxNodes) break;
    selectedIds.add(item.caseRecord.id);
  }

  return selectedIds;
}

function tokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token.length > 3 && !STOP_WORDS.has(token))
    .slice(0, 30);
}

function newestReleaseDate(cases: CaseRecord[]) {
  return cases.reduce<string | null>((newest, item) => {
    if (!item.releaseDate) return newest;
    return !newest || item.releaseDate > newest ? item.releaseDate : newest;
  }, null);
}
