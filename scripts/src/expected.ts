import type { ReviewReason, Route, SampleInvoice } from "./data.ts";

export interface ExpectedInvoice {
  file: string;
  case: string;
  route: Route;
  review_reasons: ReviewReason[];
  has_text_layer: boolean;
  fields: {
    supplier_name: string;
    supplier_tax_id: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string | null;
    currency: string;
    net_amount: number;
    vat_rate: number;
    vat_amount: number;
    total_amount: number;
  };
  notes: string[];
}

export interface ExpectedFile {
  description: string;
  invoices: ExpectedInvoice[];
}

export function toExpected(inv: SampleInvoice): ExpectedInvoice {
  return {
    file: inv.file,
    case: inv.title,
    route: inv.route,
    review_reasons: inv.reviewReasons,
    has_text_layer: !inv.scanned,
    fields: {
      supplier_name: inv.supplier.name,
      supplier_tax_id: inv.supplier.taxId,
      invoice_number: inv.number,
      invoice_date: inv.invoiceDate,
      due_date: inv.dueDate,
      currency: inv.currency,
      net_amount: inv.netAmount,
      vat_rate: inv.vatRate,
      vat_amount: inv.vatAmount,
      total_amount: inv.totalAmount,
    },
    notes: inv.notes,
  };
}
