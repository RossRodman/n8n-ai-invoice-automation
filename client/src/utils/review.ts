import type { ReviewItem } from "@/types";

export function countReasons(items: ReviewItem[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const reason of items.flatMap((item) => item.review_reasons)) {
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }

  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
