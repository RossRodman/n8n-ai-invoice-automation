import { Stack, Typography } from "@mui/material";

import { Styled } from "@/styled";
import type { Invoice } from "@/types";
import { formatMoney } from "@/utils/format";
import { currenciesByUse, sumInvoices } from "@/utils/invoices";

interface FilteredTotalsProps {
  invoices: Invoice[];
}

export function FilteredTotals({ invoices }: FilteredTotalsProps) {
  const currencies = currenciesByUse(invoices);

  return (
    <Stack
      direction="row"
      spacing={2}
      useFlexGap
      sx={{ flexWrap: "wrap", alignItems: "baseline", color: "text.secondary" }}
      role="status"
      aria-label="Totals"
    >
      <Typography variant="body2">
        {invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}
      </Typography>
      {currencies.map((currency) => {
        const totals = sumInvoices(invoices.filter((invoice) => invoice.currency === currency));

        return (
          <Typography key={currency} variant="body2">
            <Typography
              component="span"
              variant="body2"
              sx={[Styled.Mono, { color: "text.primary", fontWeight: 600 }]}
            >
              {formatMoney(totals.total, currency)}
            </Typography>{" "}
            incl. VAT {formatMoney(totals.vat, currency)}
          </Typography>
        );
      })}
    </Stack>
  );
}
