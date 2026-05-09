export function formatDate(date: string | null, fallback = "Unknown date") {
  if (!date) return fallback;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(parsed);
}

export function getYear(date: string | null) {
  if (!date) return "Unknown";
  return date.slice(0, 4);
}

export function sortByNewestRelease<T extends { releaseDate: string | null }>(
  items: T[]
) {
  return [...items].sort((a, b) => {
    const left = a.releaseDate ? Date.parse(a.releaseDate) : 0;
    const right = b.releaseDate ? Date.parse(b.releaseDate) : 0;
    return right - left;
  });
}

export function sortByIncidentDate<T extends { incidentDate: string | null }>(
  items: T[]
) {
  return [...items].sort((a, b) => {
    const left = a.incidentDate ? Date.parse(a.incidentDate) : Infinity;
    const right = b.incidentDate ? Date.parse(b.incidentDate) : Infinity;
    return left - right;
  });
}
