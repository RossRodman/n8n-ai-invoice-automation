import { Box, Card, Skeleton, Stack, Typography } from "@mui/material";

import { SectionHeader } from "@/components/sectionHeader";
import { Styled } from "@/styled";
import type { Invoice } from "@/types";
import { formatMoney } from "@/utils/format";
import { topSuppliers } from "@/utils/invoices";

interface TopSuppliersProps {
  invoices: Invoice[] | undefined;
  currency: string | null;
}

export function TopSuppliers({ invoices, currency }: TopSuppliersProps) {
  const suppliers = invoices && currency ? topSuppliers(invoices, currency) : [];
  const largest = suppliers[0]?.total || 1;

  return (
    <Card component="section" aria-labelledby="suppliers-title" sx={Styled.Panel}>
      <SectionHeader
        id="suppliers-title"
        title="Top suppliers"
        description={currency ? `By amount billed in ${currency}` : "By amount billed"}
      />

      {!invoices ? (
        <Stack spacing={2} sx={{ mt: 2.5 }}>
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} variant="rounded" height={36} />
          ))}
        </Stack>
      ) : suppliers.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 2.5 }}>
          Suppliers show up here once invoices are booked.
        </Typography>
      ) : (
        <Stack
          component="ol"
          spacing={2}
          sx={[Styled.PanelBody, { listStyle: "none", p: 0, m: 0, mt: 2 }]}
        >
          {suppliers.map((supplier) => (
            <li key={supplier.name}>
              <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between" }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 500, minWidth: 0 }}>
                  {supplier.name}
                </Typography>
                <Typography variant="body2" sx={[Styled.Mono, { flexShrink: 0 }]}>
                  {formatMoney(supplier.total, currency, { whole: true })}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mt: 0.75 }}>
                <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: "action.hover" }}>
                  <Box
                    sx={{
                      width: `${Math.max(2, (supplier.total / largest) * 100)}%`,
                      height: "100%",
                      borderRadius: 3,
                      bgcolor: "primary.main",
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ color: "text.secondary", flexShrink: 0 }}>
                  {supplier.count} {supplier.count === 1 ? "invoice" : "invoices"}
                </Typography>
              </Stack>
            </li>
          ))}
        </Stack>
      )}
    </Card>
  );
}
