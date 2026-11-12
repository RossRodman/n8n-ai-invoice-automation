import type { ReviewStatus } from "@/types";

export const queryKeys = {
  health: ["health"] as const,
  invoices: ["invoices"] as const,
  reviewAll: ["review"] as const,
  review: (status: ReviewStatus | "all") => ["review", status] as const,
};
