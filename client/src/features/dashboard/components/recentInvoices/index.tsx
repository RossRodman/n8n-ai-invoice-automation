import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import InboxOutlined from "@mui/icons-material/InboxOutlined";
import {
  Button,
  Card,
  List,
  ListItemButton,
  ListItemText,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router";

import { EmptyState } from "@/components/emptyState";
import { SectionHeader } from "@/components/sectionHeader";
import { Styled } from "@/styled";
import type { Invoice } from "@/types";
import { formatDate, formatMoney } from "@/utils/format";

const SHOWN = 10;

interface RecentInvoicesProps {
  invoices: Invoice[] | undefined;
}

export function RecentInvoices({ invoices }: RecentInvoicesProps) {
  return (
    <Card component="section" aria-labelledby="recent-title" sx={Styled.Panel}>
      <SectionHeader
        id="recent-title"
        title="Latest invoices"
        description="The most recent rows in the ledger"
        action={
          <Button
            component={RouterLink}
            to="/invoices"
            size="small"
            endIcon={<ArrowForwardRounded />}
            sx={{ flexShrink: 0 }}
          >
            View all
          </Button>
        }
      />

      {!invoices ? (
        <Stack spacing={1} sx={{ mt: 2 }}>
          {Array.from({ length: 4 }, (_, key) => (
            <Skeleton key={key} variant="rounded" height={52} />
          ))}
        </Stack>
      ) : invoices.length === 0 ? (
        <EmptyState icon={InboxOutlined} title="No invoices yet">
          Email a PDF invoice to the inbox the workflow watches. It shows up here a minute later.
        </EmptyState>
      ) : (
        <List disablePadding sx={[Styled.PanelBody, { mt: 1, mx: -1 }]}>
          {invoices.slice(0, SHOWN).map((invoice) => (
            <ListItemButton
              key={invoice.id}
              component={RouterLink}
              to={`/invoices/${invoice.id}`}
              sx={{ px: 1, py: 0.5, gap: 2 }}
            >
              <ListItemText
                primary={invoice.supplier_name ?? "Unknown supplier"}
                secondary={[
                  invoice.invoice_number && `No. ${invoice.invoice_number}`,
                  formatDate(invoice.invoice_date),
                ]
                  .filter(Boolean)
                  .join(" · ")}
                slotProps={{
                  primary: { noWrap: true, sx: { fontWeight: 500 } },
                  secondary: { noWrap: true },
                }}
                sx={{ minWidth: 0 }}
              />
              <Typography sx={[Styled.Mono, { flexShrink: 0, fontWeight: 500 }]}>
                {formatMoney(invoice.total_amount, invoice.currency)}
              </Typography>
            </ListItemButton>
          ))}
        </List>
      )}
    </Card>
  );
}
