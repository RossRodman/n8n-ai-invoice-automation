import { useQuery } from "@tanstack/react-query";

import { api } from "@/api";
import { queryKeys } from "@/constants";

export function useInvoices() {
  return useQuery({
    queryKey: queryKeys.invoices,
    queryFn: ({ signal }) => api.invoices(signal),
    refetchInterval: 60_000,
  });
}
