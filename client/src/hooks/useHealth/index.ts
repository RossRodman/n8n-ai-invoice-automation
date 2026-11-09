import { useQuery } from "@tanstack/react-query";

import { api } from "@/api";
import { queryKeys } from "@/constants";

export type HealthState = { kind: "loading" } | { kind: "online" } | { kind: "offline" };

export function useHealth(): HealthState {
  const query = useQuery({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) => api.health(signal),
    refetchInterval: 30_000,
    retry: false,
  });

  if (query.data) return { kind: "online" };
  if (query.isError) return { kind: "offline" };

  return { kind: "loading" };
}
