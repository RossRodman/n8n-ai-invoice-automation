import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { api } from "@/api";
import { queryKeys } from "@/constants";
import type { ApproveRequest, RejectRequest, ReviewItem, ReviewStatus } from "@/types";

function settle(client: QueryClient, id: number, status: ReviewStatus, note?: string) {
  const resolvedAt = new Date().toISOString();

  for (const [key, items] of client.getQueriesData<ReviewItem[]>({
    queryKey: queryKeys.reviewAll,
  })) {
    if (!items) continue;
    const list = key[1];
    const updated = items
      .map((item) =>
        item.id === id
          ? { ...item, status, resolved_at: resolvedAt, resolution_note: note || null }
          : item,
      )
      .filter((item) => list === "all" || item.status === list);
    client.setQueryData(key, updated);
  }

  void client.invalidateQueries({ queryKey: queryKeys.reviewAll });
}

export function useApprove() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (request: ApproveRequest) => api.approve(request),
    onSuccess: (_invoice, request) => {
      settle(client, request.id, "approved", request.note);
      void client.invalidateQueries({ queryKey: queryKeys.invoices });
    },
    onError: () => void client.invalidateQueries({ queryKey: queryKeys.reviewAll }),
  });
}

export function useReject() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (request: RejectRequest) => api.reject(request),
    onSuccess: (_result, request) => settle(client, request.id, "rejected", request.note),
    onError: () => void client.invalidateQueries({ queryKey: queryKeys.reviewAll }),
  });
}
