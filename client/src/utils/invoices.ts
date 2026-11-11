import type { Invoice } from "@/types";

const toCents = (value: number | null) => Math.round((value ?? 0) * 100);
const fromCents = (cents: number) => cents / 100;

export function invoiceMonth(invoice: Invoice): string | null {
  const source = invoice.invoice_date ?? invoice.received_at;

  return source && /^\d{4}-\d{2}/.test(source) ? source.slice(0, 7) : null;
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function currenciesByUse(invoices: Invoice[]): string[] {
  const counts = new Map<string, number>();

  for (const { currency } of invoices) {
    if (currency) counts.set(currency, (counts.get(currency) ?? 0) + 1);
  }

  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([code]) => code);
}

export interface Totals {
  count: number;
  net: number;
  vat: number;
  total: number;
}

export function sumInvoices(invoices: Invoice[]): Totals {
  const cents = invoices.reduce(
    (sum, invoice) => ({
      net: sum.net + toCents(invoice.net_amount),
      vat: sum.vat + toCents(invoice.vat_amount),
      total: sum.total + toCents(invoice.total_amount),
    }),
    { net: 0, vat: 0, total: 0 },
  );

  return {
    count: invoices.length,
    net: fromCents(cents.net),
    vat: fromCents(cents.vat),
    total: fromCents(cents.total),
  };
}

export interface MonthTotal {
  month: string;
  count: number;
  total: number;
}

export function monthlyTotals(
  invoices: Invoice[],
  currency: string,
  { months = 6, now = new Date() }: { months?: number; now?: Date } = {},
): MonthTotal[] {
  const keys = Array.from({ length: months }, (_, index) =>
    monthKey(new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1)),
  );

  return keys.map((month) => {
    const inMonth = invoices.filter((i) => i.currency === currency && invoiceMonth(i) === month);

    return { month, count: inMonth.length, total: sumInvoices(inMonth).total };
  });
}

export interface SupplierTotal {
  name: string;
  count: number;
  total: number;
}

export function topSuppliers(invoices: Invoice[], currency: string, limit = 5): SupplierTotal[] {
  const bySupplier = new Map<string, Invoice[]>();
  for (const invoice of invoices) {
    if (invoice.currency !== currency) continue;
    const name = invoice.supplier_name ?? "Unknown supplier";
    bySupplier.set(name, [...(bySupplier.get(name) ?? []), invoice]);
  }

  return [...bySupplier]
    .map(([name, list]) => ({ name, count: list.length, total: sumInvoices(list).total }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function amountsAddUp(invoice: Invoice): boolean | null {
  const { net_amount: net, vat_amount: vat, total_amount: total } = invoice;
  if (net === null || vat === null || total === null) return null;

  return Math.abs(toCents(net) + toCents(vat) - toCents(total)) <= 2;
}

export function averageConfidence(invoices: Invoice[]): number | null {
  const values = invoices.map((i) => i.confidence).filter((c): c is number => c !== null);

  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export type SortKey = "invoice_date" | "supplier_name" | "total_amount" | "received_at";
export type SortDirection = "asc" | "desc";

export interface InvoiceFilters {
  search: string;
  currency: string | null;
  sort: SortKey;
  direction: SortDirection;
}

const SEARCHED: (keyof Invoice)[] = [
  "supplier_name",
  "supplier_tax_id",
  "invoice_number",
  "file_name",
  "email_from",
];

export function filterInvoices(invoices: Invoice[], filters: InvoiceFilters): Invoice[] {
  const needle = filters.search.trim().toLocaleLowerCase();
  const matches = invoices.filter(
    (invoice) =>
      (!filters.currency || invoice.currency === filters.currency) &&
      (!needle ||
        SEARCHED.some((field) =>
          String(invoice[field] ?? "")
            .toLocaleLowerCase()
            .includes(needle),
        )),
  );

  const sign = filters.direction === "asc" ? 1 : -1;
  const value = (invoice: Invoice) => invoice[filters.sort];

  return matches.toSorted((a, b) => {
    const left = value(a);
    const right = value(b);
    if (left === null || right === null) return left === right ? 0 : left === null ? 1 : -1;

    const order =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right));

    return (order || a.id - b.id) * sign;
  });
}

const CSV_COLUMNS: (keyof Invoice)[] = [
  "invoice_date",
  "due_date",
  "supplier_name",
  "supplier_tax_id",
  "invoice_number",
  "currency",
  "net_amount",
  "vat_rate",
  "vat_amount",
  "total_amount",
  "confidence",
  "received_at",
  "email_from",
  "email_subject",
  "file_name",
  "email_link",
];

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export function invoicesToCsv(invoices: Invoice[]): string {
  const lines = [
    CSV_COLUMNS.join(","),
    ...invoices.map((invoice) => CSV_COLUMNS.map((column) => csvCell(invoice[column])).join(",")),
  ];

  return `﻿${lines.join("\r\n")}\r\n`;
}
