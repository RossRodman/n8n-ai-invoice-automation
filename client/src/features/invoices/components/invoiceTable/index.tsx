import {
  Box,
  Link,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router";

import { ConfidenceChip } from "@/components/confidenceChip";
import { Styled } from "@/styled";
import type { Invoice } from "@/types";
import { formatDate, formatMoney, formatPercent } from "@/utils/format";
import type { SortDirection, SortKey } from "@/utils/invoices";

import { PAGE_SIZES } from "../../hooks";

interface Column {
  label: string;
  sort?: SortKey;
  align?: "right";
  from?: "sm" | "md" | "lg";
}

const COLUMNS: Column[] = [
  { label: "Date", sort: "invoice_date", from: "sm" },
  { label: "Supplier", sort: "supplier_name" },
  { label: "Invoice no.", from: "sm" },
  { label: "Due", from: "lg" },
  { label: "Net", align: "right", from: "md" },
  { label: "VAT", align: "right", from: "md" },
  { label: "Total", sort: "total_amount", align: "right" },
  { label: "Confidence", align: "right", from: "sm" },
];

const visibleFrom = (from: Column["from"]) =>
  from ? { display: { xs: "none", [from]: "table-cell" } } : {};

interface InvoiceTableProps {
  invoices: Invoice[] | undefined;
  total: number;
  sort: SortKey;
  direction: SortDirection;
  page: number;
  pageSize: number;
  search: string;
  onSort: (sort: SortKey, direction: SortDirection) => void;
  onPage: (page: number) => void;
  onPageSize: (pageSize: number) => void;
}

export function InvoiceTable({
  invoices,
  total,
  sort,
  direction,
  page,
  pageSize,
  search,
  onSort,
  onPage,
  onPageSize,
}: InvoiceTableProps) {
  const navigate = useNavigate();
  const href = (invoice: Invoice) => `/invoices/${invoice.id}${search ? `?${search}` : ""}`;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <TableContainer sx={{ flex: 1, minHeight: 0 }}>
        <Table
          size="small"
          stickyHeader
          sx={{ "& td, & th": { whiteSpace: "nowrap" }, "& td": { py: 0.75 } }}
        >
          <TableHead>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableCell
                  key={column.label}
                  align={column.align}
                  sortDirection={column.sort === sort ? direction : false}
                  sx={[
                    { color: "text.secondary", fontWeight: 600, py: 1.25 },
                    visibleFrom(column.from),
                  ]}
                >
                  {column.sort ? (
                    <TableSortLabel
                      active={column.sort === sort}
                      direction={column.sort === sort ? direction : "desc"}
                      onClick={() =>
                        onSort(
                          column.sort as SortKey,
                          column.sort === sort && direction === "desc" ? "asc" : "desc",
                        )
                      }
                    >
                      {column.label}
                      {column.sort === sort && (
                        <Box component="span" sx={Styled.VisuallyHidden}>
                          {direction === "desc" ? "sorted descending" : "sorted ascending"}
                        </Box>
                      )}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {!invoices
              ? Array.from({ length: 6 }, (_, row) => (
                  <TableRow key={row}>
                    {COLUMNS.map((column) => (
                      <TableCell key={column.label} sx={visibleFrom(column.from)}>
                        <Skeleton />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : invoices.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    hover
                    onClick={() => void navigate(href(invoice))}
                    sx={{ cursor: "pointer", "&:last-child td": { borderBottom: 0 } }}
                  >
                    <TableCell sx={visibleFrom("sm")}>{formatDate(invoice.invoice_date)}</TableCell>
                    <TableCell sx={{ maxWidth: { xs: 190, sm: 280 } }}>
                      <Link
                        component={RouterLink}
                        to={href(invoice)}
                        underline="hover"
                        color="inherit"
                        onClick={(event) => event.stopPropagation()}
                        sx={{
                          fontWeight: 500,
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {invoice.supplier_name ?? "Unknown supplier"}
                      </Link>
                      <Typography variant="caption" sx={[Styled.Mono, { color: "text.secondary" }]}>
                        {invoice.supplier_tax_id ?? "No tax ID"}
                        <Box component="span" sx={{ display: { sm: "none" } }}>
                          {" · "}
                          {formatDate(invoice.invoice_date)}
                        </Box>
                      </Typography>
                    </TableCell>
                    <TableCell sx={[Styled.Mono, visibleFrom("sm")]}>
                      {invoice.invoice_number ?? "—"}
                    </TableCell>
                    <TableCell sx={visibleFrom("lg")}>{formatDate(invoice.due_date)}</TableCell>
                    <TableCell align="right" sx={[Styled.Mono, visibleFrom("md")]}>
                      {formatMoney(invoice.net_amount, null)}
                    </TableCell>
                    <TableCell align="right" sx={visibleFrom("md")}>
                      <Typography
                        variant="caption"
                        component="span"
                        sx={{ color: "text.secondary", mr: 1 }}
                      >
                        {formatPercent(invoice.vat_rate)}
                      </Typography>
                      <Typography variant="body2" component="span" sx={Styled.Mono}>
                        {formatMoney(invoice.vat_amount, null)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={[Styled.Mono, { fontWeight: 600 }]}>
                      {formatMoney(invoice.total_amount, invoice.currency)}
                    </TableCell>
                    <TableCell align="right" sx={visibleFrom("sm")}>
                      <ConfidenceChip value={invoice.confidence} />
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>

      {total > 0 && (
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[...PAGE_SIZES]}
          onPageChange={(_, next) => onPage(next)}
          onRowsPerPageChange={(event) => onPageSize(Number(event.target.value))}
          sx={{
            borderTop: 1,
            borderColor: "divider",
            "& .MuiTablePagination-selectLabel, & .MuiTablePagination-input": {
              display: { xs: "none", sm: "flex" },
            },
          }}
        />
      )}
    </Box>
  );
}
