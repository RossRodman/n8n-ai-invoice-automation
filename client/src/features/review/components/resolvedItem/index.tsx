import { Alert, Box, Stack, Typography } from "@mui/material";

import { EDITABLE_FIELDS } from "@/api";
import { Styled } from "@/styled";
import type { EditableField, ReviewItem } from "@/types";
import { formatDate, formatDateTime, formatMoney, formatPercent } from "@/utils/format";
import { FIELD_LABELS } from "@/utils/review";

import { ItemHeading } from "../itemHeading";

function display(item: ReviewItem, field: EditableField): string {
  switch (field) {
    case "invoice_date":
    case "due_date":
      return formatDate(item[field]);

    case "vat_rate":
      return formatPercent(item.vat_rate);

    case "net_amount":
    case "vat_amount":
    case "total_amount":
      return formatMoney(item[field], item.currency);

    default:
      return item[field] ?? "—";
  }
}

export function ResolvedItem({ item }: { item: ReviewItem }) {
  const approved = item.status === "approved";

  return (
    <Stack spacing={3} sx={{ p: { xs: 2, sm: 3 } }}>
      <ItemHeading item={item} />

      <Alert severity={approved ? "success" : "info"} variant="outlined">
        <strong>
          {approved ? "Approved" : "Rejected"} {formatDateTime(item.resolved_at)}.
        </strong>{" "}
        {approved ? "It is in the Invoices tab." : "It stays out of the books."}
        {item.resolution_note && (
          <Box component="q" sx={{ display: "block", mt: 0.5, fontStyle: "italic" }}>
            {item.resolution_note}
          </Box>
        )}
      </Alert>

      <section aria-labelledby="held-back-title">
        <Typography id="held-back-title" variant="h4" component="h3" sx={{ mb: 0.5 }}>
          As extracted
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
          {item.review_details ?? "The fields the workflow read from the PDF."}
        </Typography>
        <Box
          component="dl"
          sx={{
            m: 0,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
            columnGap: 3,
          }}
        >
          {EDITABLE_FIELDS.map((field) => (
            <Stack
              key={field}
              direction="row"
              spacing={2}
              sx={{
                justifyContent: "space-between",
                py: 1,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <Typography component="dt" variant="body2" sx={{ color: "text.secondary" }}>
                {FIELD_LABELS[field]}
              </Typography>
              <Typography
                component="dd"
                variant="body2"
                sx={[
                  { m: 0, textAlign: "right", overflowWrap: "anywhere" },
                  field === "supplier_name" ? {} : Styled.Mono,
                ]}
              >
                {display(item, field)}
              </Typography>
            </Stack>
          ))}
        </Box>
      </section>
    </Stack>
  );
}
