import DownloadRounded from "@mui/icons-material/DownloadRounded";
import FilterAltOffOutlined from "@mui/icons-material/FilterAltOffOutlined";
import InboxOutlined from "@mui/icons-material/InboxOutlined";
import { Box, Button, Card, Stack, Typography } from "@mui/material";
import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { EmptyState } from "@/components/emptyState";
import { QueryError } from "@/components/queryError";
import { useInvoices } from "@/hooks/useInvoices";
import { Styled } from "@/styled";
import type { Invoice } from "@/types";
import { currenciesByUse, filterInvoices, invoicesToCsv } from "@/utils/invoices";

import { FilteredTotals, InvoiceDrawer, InvoiceTable, InvoiceToolbar } from "../../components";
import { useInvoiceFilters } from "../../hooks";

function download(invoices: Invoice[]) {
  const url = URL.createObjectURL(new Blob([invoicesToCsv(invoices)], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function InvoicesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const invoices = useInvoices();
  const { view, update, isFiltered, search } = useInvoiceFilters();

  const all = invoices.data;
  const filtered = all ? filterInvoices(all, view) : undefined;
  const pageCount = filtered ? Math.max(1, Math.ceil(filtered.length / view.pageSize)) : 1;
  const page = Math.min(view.page, pageCount - 1);
  const rows = filtered?.slice(page * view.pageSize, (page + 1) * view.pageSize);

  const selected = id && all ? (all.find((invoice) => String(invoice.id) === id) ?? null) : null;

  const [shown, setShown] = useState<Invoice | null>(null);

  if (selected && selected !== shown) setShown(selected);

  const onSearch = useCallback((value: string) => update({ search: value }), [update]);
  const closeDrawer = () =>
    void navigate({ pathname: "/invoices", search }, { preventScrollReset: true });

  return (
    <Stack spacing={3} sx={{ flex: 1, minHeight: 0 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between", alignItems: { sm: "flex-end" } }}
      >
        <div>
          <Typography variant="h2" component="h1">
            Invoices
          </Typography>
          <Typography sx={Styled.SectionDescription}>
            Every invoice that passed the checks, as booked in the Invoices tab.
          </Typography>
        </div>
        <Button
          variant="outlined"
          startIcon={<DownloadRounded />}
          disabled={!filtered?.length}
          onClick={() => filtered && download(filtered)}
          sx={{ flexShrink: 0 }}
        >
          Download CSV
        </Button>
      </Stack>

      {invoices.isError ? (
        <QueryError
          title="Couldn't load the invoices"
          error={invoices.error}
          onRetry={() => void invoices.refetch()}
        />
      ) : (
        <Card
          sx={{ display: "flex", flexDirection: "column", flex: { md: 1 }, minHeight: { md: 320 } }}
        >
          <Stack spacing={2} sx={{ p: 2 }}>
            <InvoiceToolbar
              search={view.search}
              currency={view.currency}
              currencies={currenciesByUse(all ?? [])}
              onSearch={onSearch}
              onCurrency={(currency) => update({ currency })}
            />
            {filtered && filtered.length > 0 && <FilteredTotals invoices={filtered} />}
          </Stack>

          <Box
            sx={{
              borderTop: 1,
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
            }}
          >
            {all?.length === 0 ? (
              <EmptyState icon={InboxOutlined} title="No invoices yet">
                Email a PDF invoice to the inbox the workflow watches. Once it passes the checks it
                shows up here.
              </EmptyState>
            ) : filtered?.length === 0 ? (
              <EmptyState
                icon={FilterAltOffOutlined}
                title="No invoices match"
                action={
                  isFiltered && (
                    <Button onClick={() => update({ search: "", currency: null })}>
                      Clear filters
                    </Button>
                  )
                }
              >
                Try a different supplier, tax ID or invoice number.
              </EmptyState>
            ) : (
              <InvoiceTable
                invoices={rows}
                total={filtered?.length ?? 0}
                sort={view.sort}
                direction={view.direction}
                page={page}
                pageSize={view.pageSize}
                search={search}
                onSort={(sort, direction) => update({ sort, direction })}
                onPage={(next) => update({ page: next })}
                onPageSize={(pageSize) => update({ pageSize })}
              />
            )}
          </Box>
        </Card>
      )}

      <InvoiceDrawer
        open={Boolean(id) && Boolean(all)}
        invoice={selected ?? (id ? null : shown)}
        onClose={closeDrawer}
      />
    </Stack>
  );
}
