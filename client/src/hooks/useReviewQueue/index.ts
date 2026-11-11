import { useQuery } from "@tanstack/react-query";

import { api } from "@/api";
import { queryKeys } from "@/constants";
import type { ReviewStatus } from "@/types";

export function useReviewQueue(status: ReviewStatus | "all" = "open") {
  return useQuery({
    queryKey: queryKeys.review(status),
    queryFn: ({ signal }) => api.review(status, signal),
    refetchInterval: 60_000,
  });
}
