export interface Health {
  status: "ok";
}

export interface Invoice {
  id: number;
  received_at: string | null;
  supplier_name: string | null;
  supplier_tax_id: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  currency: string | null;
  net_amount: number | null;
  vat_rate: number | null;
  vat_amount: number | null;
  total_amount: number | null;
  confidence: number | null;
  file_name: string | null;
  email_from: string | null;
  email_subject: string | null;
  email_link: string | null;
  gmail_message_id: string | null;
}

export type ReviewReason =
  | "missing_fields"
  | "amounts_mismatch"
  | "invalid_date"
  | "low_confidence"
  | "duplicate"
  | "no_text_layer"
  | "extraction_failed";

export type ReviewStatus = "open" | "approved" | "rejected";

export interface ReviewItem extends Invoice {
  review_reasons: ReviewReason[];
  review_details: string | null;
  status: ReviewStatus;
  resolved_at: string | null;
  resolution_note: string | null;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function describeError(body: unknown): string | null {
  if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
    return body.message;
  }

  return null;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);

    throw new ApiError(
      response.status,
      describeError(body) ?? `${init?.method ?? "GET"} ${url} failed (${response.status})`,
    );
  }

  return (await response.json()) as T;
}

export const api = {
  health: (signal?: AbortSignal) => request<Health>("/healthz", { signal }),

  invoices: async (signal?: AbortSignal) =>
    (await request<{ invoices: Invoice[] }>("/api/invoices", { signal })).invoices,

  review: async (status: ReviewStatus | "all", signal?: AbortSignal) =>
    (await request<{ items: ReviewItem[] }>(`/api/review?status=${status}`, { signal })).items,
};
