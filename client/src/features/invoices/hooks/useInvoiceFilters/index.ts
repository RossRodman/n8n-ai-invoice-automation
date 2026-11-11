import { useCallback } from "react";
import { useSearchParams } from "react-router";

import type { InvoiceFilters, SortKey } from "@/utils/invoices";

const SORT_KEYS: SortKey[] = ["invoice_date", "supplier_name", "total_amount", "received_at"];
export const PAGE_SIZES = [10, 25, 50] as const;

export interface InvoiceView extends InvoiceFilters {
  page: number;
  pageSize: number;
}

const DEFAULTS: InvoiceView = {
  search: "",
  currency: null,
  sort: "invoice_date",
  direction: "desc",
  page: 0,
  pageSize: 25,
};

function readView(params: URLSearchParams): InvoiceView {
  const sort = params.get("sort") as SortKey | null;
  const pageSize = Number(params.get("size"));

  return {
    search: params.get("q") ?? DEFAULTS.search,
    currency: params.get("currency") || DEFAULTS.currency,
    sort: sort && SORT_KEYS.includes(sort) ? sort : DEFAULTS.sort,
    direction: params.get("dir") === "asc" ? "asc" : "desc",
    page: Math.max(0, Math.floor(Number(params.get("page"))) || 0),
    pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize) ? pageSize : DEFAULTS.pageSize,
  };
}

function writeView(view: InvoiceView): URLSearchParams {
  const entries: [string, string | number | null][] = [
    ["q", view.search || null],
    ["currency", view.currency],
    ["sort", view.sort === DEFAULTS.sort ? null : view.sort],
    ["dir", view.direction === DEFAULTS.direction ? null : view.direction],
    ["page", view.page || null],
    ["size", view.pageSize === DEFAULTS.pageSize ? null : view.pageSize],
  ];

  return new URLSearchParams(
    entries.flatMap(([key, value]) => (value === null ? [] : [[key, String(value)]])),
  );
}

export function useInvoiceFilters() {
  const [params, setParams] = useSearchParams();
  const view = readView(params);

  const update = useCallback(
    (changes: Partial<InvoiceView>) =>
      setParams(
        (current) => {
          const next = { ...readView(current), ...changes };

          if (!("page" in changes)) next.page = 0;

          return writeView(next);
        },
        { replace: true, preventScrollReset: true },
      ),
    [setParams],
  );

  return {
    view,
    update,
    isFiltered: Boolean(view.search || view.currency),
    search: params.toString(),
  };
}
