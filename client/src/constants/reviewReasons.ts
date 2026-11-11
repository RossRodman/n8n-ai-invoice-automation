import type { ReviewReason } from "@/types";

export const REVIEW_REASON_LABELS: Record<ReviewReason, string> = {
  missing_fields: "Missing fields",
  amounts_mismatch: "Amounts don't add up",
  invalid_date: "Date problem",
  low_confidence: "Low confidence",
  duplicate: "Possible duplicate",
  no_text_layer: "Scanned PDF",
  extraction_failed: "Couldn't read",
};

export function reviewReasonLabel(reason: string): string {
  return REVIEW_REASON_LABELS[reason as ReviewReason] ?? reason.replaceAll("_", " ");
}
