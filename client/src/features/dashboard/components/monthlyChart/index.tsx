import { Box, Card, Skeleton, Typography } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import { lazy, Suspense } from "react";

import { MONO, PRIMARY } from "@/app/theme";
import { SectionHeader } from "@/components/sectionHeader";
import { Styled } from "@/styled";
import type { Invoice } from "@/types";
import { formatCompactMoney, formatMoney, formatMonth } from "@/utils/format";
import { monthlyTotals } from "@/utils/invoices";

const PHONE_HEIGHT = 240;

const BarChart = lazy(async () => ({
  default: (await import("@mui/x-charts/BarChart")).BarChart,
}));

interface MonthlyChartProps {
  invoices: Invoice[] | undefined;
  currency: string | null;
  now: Date;
}

function usePrimaryColor(): string {
  const { mode, systemMode } = useColorScheme();
  const scheme = (mode === "system" ? systemMode : mode) ?? "light";

  return PRIMARY[scheme];
}

export function MonthlyChart({ invoices, currency, now }: MonthlyChartProps) {
  const color = usePrimaryColor();
  const months = currency && invoices ? monthlyTotals(invoices, currency, { now }) : [];
  const dataset = months.map((m) => ({ ...m, label: formatMonth(m.month) }));
  const empty = months.every((m) => m.count === 0);

  return (
    <Card component="section" aria-labelledby="monthly-title" sx={Styled.Panel}>
      <SectionHeader
        id="monthly-title"
        title="Booked per month"
        description={
          currency
            ? `Invoice totals in ${currency}, last 6 months`
            : "Invoice totals, last 6 months"
        }
      />

      <Box sx={{ mt: 2, flex: 1, minHeight: { xs: PHONE_HEIGHT, md: 80 }, position: "relative" }}>
        <Box sx={{ position: "absolute", inset: 0 }}>
          {!invoices ? (
            <Skeleton variant="rounded" height="100%" />
          ) : empty || !currency ? (
            <Typography
              sx={{
                color: "text.secondary",
                display: "grid",
                placeItems: "center",
                height: "100%",
              }}
            >
              No invoices in the last 6 months yet.
            </Typography>
          ) : (
            <>
              <Suspense fallback={<Skeleton variant="rounded" height="100%" />}>
                <BarChart
                  dataset={dataset}
                  hideLegend
                  borderRadius={4}
                  grid={{ horizontal: true }}
                  margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
                  xAxis={[
                    {
                      scaleType: "band",
                      dataKey: "label",
                      categoryGapRatio: 0.55,
                      disableLine: true,
                      disableTicks: true,
                    },
                  ]}
                  yAxis={[
                    {
                      width: 76,
                      disableLine: true,
                      disableTicks: true,
                      tickNumber: 2,
                      valueFormatter: (value: number) => formatCompactMoney(value, currency),
                    },
                  ]}
                  series={[
                    {
                      dataKey: "total",
                      label: `Booked, ${currency}`,
                      color,
                      valueFormatter: (value) => formatMoney(value, currency),
                    },
                  ]}
                  sx={{
                    "& .MuiChartsAxis-tickLabel": { fill: "var(--mui-palette-text-secondary)" },
                    "& .MuiChartsAxis-left .MuiChartsAxis-tickLabel": { fontFamily: MONO },
                    "& .MuiChartsGrid-line": {
                      stroke: "var(--mui-palette-divider)",
                      strokeDasharray: "2 4",
                    },
                  }}
                />
              </Suspense>

              <Box component="table" sx={Styled.VisuallyHidden}>
                <caption>Invoice totals in {currency} per month</caption>
                <tbody>
                  {dataset.map((m) => (
                    <tr key={m.month}>
                      <th scope="row">{m.label}</th>
                      <td>{formatMoney(m.total, currency)}</td>
                      <td>{m.count} invoices</td>
                    </tr>
                  ))}
                </tbody>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Card>
  );
}
