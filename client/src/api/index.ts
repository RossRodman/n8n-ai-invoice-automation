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

export const EDITABLE_FIELDS = [
  "supplier_name",
  "supplier_tax_id",
  "invoice_number",
  "invoice_date",
  "due_date",
  "currency",
  "net_amount",
  "vat_rate",
  "vat_amount",
  "total_amount",
] as const;

export type EditableField = (typeof EDITABLE_FIELDS)[number];

export type InvoiceCorrections = Partial<Pick<Invoice, EditableField>>;

export interface ApproveRequest {
  id: number;
  fields?: InvoiceCorrections;
  note?: string;
}

export interface RejectRequest {
  id: number;
  note?: string;
}

export interface RejectResult {
  id: number;
  status: "rejected";
  resolved_at: string;
}

export interface UploadResult {
  status: "processing";
  file_name: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly problems: string[];

  constructor(status: number, message: string, problems: string[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.problems = problems;
  }
}

export function describeProblems(body: unknown): string[] {
  if (body && typeof body === "object" && "problems" in body && Array.isArray(body.problems)) {
    return body.problems.filter((problem): problem is string => typeof problem === "string");
  }

  return [];
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
      // A FormData body sets its own multipart content type.
      ...(typeof init?.body === "string" ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);

    throw new ApiError(
      response.status,
      describeError(body) ?? `${init?.method ?? "GET"} ${url} failed (${response.status})`,
      describeProblems(body),
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

  approve: async (body: ApproveRequest) =>
    (
      await request<{ invoice: Invoice }>("/api/review/approve", {
        method: "POST",
        body: JSON.stringify(body),
      })
    ).invoice,

  reject: (body: RejectRequest) =>
    request<RejectResult>("/api/review/reject", { method: "POST", body: JSON.stringify(body) }),

  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);

    return request<UploadResult>("/api/upload", { method: "POST", body: form });
  },
};
