import { Box, Stack, Typography } from "@mui/material";
import { useState } from "react";

import { QueryError } from "@/components/queryError";
import { useInvoices } from "@/hooks/useInvoices";
import { useReviewQueue } from "@/hooks/useReviewQueue";
import { Styled } from "@/styled";
import { currenciesByUse } from "@/utils/invoices";

import {
  CurrencyPicker,
  MonthlyChart,
  RecentInvoices,
  ReviewSummary,
  StatTiles,
  TopSuppliers,
} from "../../components";

export function DashboardPage() {
  const invoices = useInvoices();
  const review = useReviewQueue("open");
  const currencies = currenciesByUse(invoices.data ?? []);
  // "This month" is fixed when the page opens.
  const [now] = useState(() => new Date());
  const [picked, setPicked] = useState<string | null>(null);
  const currency = picked && currencies.includes(picked) ? picked : (currencies[0] ?? null);

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between", alignItems: { sm: "flex-end" } }}
      >
        <div>
          <Typography variant="h2" component="h1">
            Dashboard
          </Typography>
          <Typography sx={Styled.SectionDescription}>
            Live from the Invoices and Review tabs in Google Sheets.
          </Typography>
        </div>
        {currency && (
          <CurrencyPicker currencies={currencies} value={currency} onChange={setPicked} />
        )}
      </Stack>

      {invoices.isError ? (
        <QueryError
          title="Couldn't load the invoices"
          error={invoices.error}
          onRetry={() => void invoices.refetch()}
        />
      ) : (
        <>
          <StatTiles invoices={invoices.data} review={review.data} currency={currency} now={now} />

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 2fr) minmax(0, 1fr)" },
              gridTemplateRows: { md: "minmax(150px, 1.15fr) minmax(140px, 1fr)" },
            }}
          >
            <MonthlyChart invoices={invoices.data} currency={currency} now={now} />
            <TopSuppliers invoices={invoices.data} currency={currency} />
            <RecentInvoices invoices={invoices.data} />
            <ReviewSummary items={review.data} error={review.error} />
          </Box>
        </>
      )}
    </Stack>
  );
}
