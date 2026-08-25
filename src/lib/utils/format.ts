export function formatPrice(estimate: number | null, level: string): string {
  if (estimate == null || estimate === 0) return level === "free" ? "Free" : "Price varies";
  return `$${estimate % 1 === 0 ? estimate : estimate.toFixed(2)}`;
}

export function formatDuration(minutes: number | null): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours} hr${hours > 1 ? "s" : ""}` : `${hours}h ${rem}m`;
}

export function formatDistance(miles: number): string {
  if (miles < 0.1) return "Nearby";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

export function formatCategoryLabel(category: string): string {
  return category
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function titleCase(s: string): string {
  return s
    .split(/[_-]/)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}
