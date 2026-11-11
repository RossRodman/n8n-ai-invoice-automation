import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import SearchOffRounded from "@mui/icons-material/SearchOffRounded";
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";

import { MIN_CONFIDENCE } from "@/components/confidenceChip";
import { EmptyState } from "@/components/emptyState";
import { Styled } from "@/styled";
import type { Invoice } from "@/types";
import { formatDate, formatDateTime, formatMoney, formatPercent } from "@/utils/format";
import { amountsAddUp } from "@/utils/invoices";

const WIDTH = 460;

interface InvoiceDrawerProps {
  open: boolean;
  invoice: Invoice | null;
  onClose: () => void;
}

export function InvoiceDrawer({ open, invoice, onClose }: InvoiceDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          role: "dialog",
          "aria-labelledby": "invoice-title",
          sx: { width: { xs: "100%", sm: WIDTH } },
        },
      }}
    >
      <Stack direction="row" sx={{ alignItems: "center", px: 3, pt: 2.5, pb: 1 }}>
        <Typography variant="overline" sx={{ color: "text.secondary", flex: 1 }}>
          Invoice
        </Typography>
        <IconButton aria-label="Close" onClick={onClose} edge="end">
          <CloseRounded />
        </IconButton>
      </Stack>

      {invoice ? (
        <InvoiceDetails invoice={invoice} />
      ) : (
        <EmptyState icon={SearchOffRounded} title="Invoice not found">
          It may have been removed from the Invoices tab in Google Sheets.
        </EmptyState>
      )}
    </Drawer>
  );
}

function InvoiceDetails({ invoice }: { invoice: Invoice }) {
  const currency = invoice.currency;
  const addsUp = amountsAddUp(invoice);

  return (
    <Stack spacing={3} sx={{ px: 3, pb: 4 }}>
      <div>
        <Typography id="invoice-title" variant="h3" component="h2">
          {invoice.supplier_name ?? "Unknown supplier"}
        </Typography>
        <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
          {[
            invoice.invoice_number && `No. ${invoice.invoice_number}`,
            formatDate(invoice.invoice_date),
          ]
            .filter(Boolean)
            .join(" · ")}
        </Typography>
      </div>

      <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: "action.hover" }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Total
        </Typography>
        <Typography
          sx={[Styled.Mono, { fontSize: "1.75rem", fontWeight: 650, letterSpacing: "-0.02em" }]}
        >
          {formatMoney(invoice.total_amount, currency)}
        </Typography>

        <Stack component="dl" spacing={0.75} sx={{ m: 0, mt: 2 }}>
          <AmountRow label="Net" value={formatMoney(invoice.net_amount, currency)} />
          <AmountRow
            label={`VAT ${formatPercent(invoice.vat_rate)}`}
            value={formatMoney(invoice.vat_amount, currency)}
          />
        </Stack>

        {addsUp !== null && (
          <Chip
            size="small"
            variant="outlined"
            color={addsUp ? "success" : "warning"}
            icon={addsUp ? <CheckCircleRounded /> : <ErrorOutlineRounded />}
            label={addsUp ? "Net + VAT matches the total" : "Net + VAT doesn't match the total"}
            sx={{ mt: 2 }}
          />
        )}
      </Box>

      <Section title="Details">
        <Field label="Supplier tax ID" mono>
          {invoice.supplier_tax_id}
        </Field>
        <Field label="Invoice number" mono>
          {invoice.invoice_number}
        </Field>
        <Field label="Invoice date">{formatDate(invoice.invoice_date)}</Field>
        <Field label="Due date">{formatDate(invoice.due_date)}</Field>
        <Field label="Currency">{currency}</Field>
        <Field label="AI confidence">
          {invoice.confidence === null ? null : (
            <Stack spacing={0.75} sx={{ alignItems: "flex-end" }}>
              <span>{formatPercent(Math.round(invoice.confidence * 100))}</span>
              <LinearProgress
                variant="determinate"
                value={invoice.confidence * 100}
                color={invoice.confidence >= MIN_CONFIDENCE ? "success" : "warning"}
                aria-label="AI confidence"
                sx={{ width: 120, height: 4, borderRadius: 2 }}
              />
            </Stack>
          )}
        </Field>
      </Section>

      <Section title="Source">
        <Field label="Received">{formatDateTime(invoice.received_at)}</Field>
        <Field label="From">{invoice.email_from}</Field>
        <Field label="Subject">{invoice.email_subject}</Field>
        <Field label="File" mono>
          {invoice.file_name}
        </Field>
        <Field label="Sheet row" mono>
          {String(invoice.id)}
        </Field>
      </Section>

      {invoice.email_link && (
        <Button
          variant="outlined"
          href={invoice.email_link}
          target="_blank"
          rel="noreferrer"
          endIcon={<OpenInNewRounded />}
        >
          Open the email in Gmail
        </Button>
      )}
    </Stack>
  );
}

function AmountRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
      <Typography component="dt" variant="body2" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography component="dd" variant="body2" sx={[Styled.Mono, { m: 0 }]}>
        {value}
      </Typography>
    </Stack>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <Typography variant="h4" component="h3" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Box component="dl" sx={{ m: 0 }}>
        {children}
      </Box>
      <Divider sx={{ mt: 1 }} />
    </section>
  );
}

function Field({ label, mono, children }: { label: string; mono?: boolean; children: ReactNode }) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ justifyContent: "space-between", alignItems: "baseline", py: 1 }}
    >
      <Typography component="dt" variant="body2" sx={{ color: "text.secondary", flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography
        component="dd"
        variant="body2"
        sx={[{ m: 0, textAlign: "right", overflowWrap: "anywhere" }, mono ? Styled.Mono : {}]}
      >
        {children ?? (
          <Box component="span" sx={{ color: "text.disabled" }}>
            —
          </Box>
        )}
      </Typography>
    </Stack>
  );
}
