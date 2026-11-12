import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import PercentOutlined from "@mui/icons-material/PercentOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import RuleOutlined from "@mui/icons-material/RuleOutlined";
import { Box } from "@mui/material";

import { StatTile } from "@/components/statTile";
import { reviewReasonLabel } from "@/constants";
import type { Invoice, ReviewItem } from "@/types";
import { formatMoney, formatMonth, formatPercent } from "@/utils/format";
import { averageConfidence, invoiceMonth, monthKey, sumInvoices } from "@/utils/invoices";
import { countReasons } from "@/utils/review";

interface StatTilesProps {
  invoices: Invoice[] | undefined;
  review: ReviewItem[] | undefined;
  currency: string | null;
  now: Date;
}

export function StatTiles({ invoices, review, currency, now }: StatTilesProps) {
  const month = monthKey(now);
  const thisMonth = (invoices ?? []).filter(
    (invoice) => invoice.currency === currency && invoiceMonth(invoice) === month,
  );
  const totals = sumInvoices(thisMonth);
  const confidence = averageConfidence(invoices ?? []);
  const waiting = review?.length ?? 0;
  const reason = review ? (countReasons(review)[0]?.[0] ?? null) : null;
  const money = (value: number) => (currency ? formatMoney(value, currency) : "—");

  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
      }}
    >
      <StatTile
        label="Booked this month"
        icon={CalendarMonthOutlined}
        loading={!invoices}
        value={money(totals.total)}
        hint={`${totals.count} ${totals.count === 1 ? "invoice" : "invoices"} in ${formatMonth(month)}`}
      />
      <StatTile
        label="VAT this month"
        icon={PercentOutlined}
        loading={!invoices}
        value={money(totals.vat)}
        hint={`Net ${money(totals.net)}`}
      />
      <StatTile
        label="Invoices in the ledger"
        icon={ReceiptLongOutlined}
        tone="success"
        loading={!invoices}
        value={invoices?.length ?? 0}
        hint={
          confidence === null
            ? "Nothing booked yet"
            : `${formatPercent(Math.round(confidence * 100))} average confidence`
        }
      />
      <StatTile
        label="Waiting for review"
        icon={RuleOutlined}
        tone={waiting ? "warning" : "success"}
        loading={!review}
        value={waiting}
        hint={reason ? `Mostly: ${reviewReasonLabel(reason).toLowerCase()}` : "Nothing waiting"}
      />
    </Box>
  );
}
