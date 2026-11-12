import { List, ListItemButton, Skeleton, Stack, Typography } from "@mui/material";
import { Link } from "react-router";

import { Styled } from "@/styled";
import type { ReviewItem } from "@/types";
import { formatDateTime, formatMoney } from "@/utils/format";
import { itemTitle } from "@/utils/review";

import { ReasonChips } from "../reasonChips";

interface ReviewListProps {
  items: ReviewItem[] | undefined;
  selectedId: number | null;
  search: string;
}

export function ReviewList({ items, selectedId, search }: ReviewListProps) {
  if (!items) {
    return (
      <Stack spacing={1} sx={{ p: 1.5 }} aria-busy>
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} variant="rounded" height={72} />
        ))}
      </Stack>
    );
  }

  return (
    <List disablePadding aria-label="Review items" sx={{ p: 1, display: "grid", gap: 0.5 }}>
      {items.map((item) => (
        <ListItemButton
          key={item.id}
          component={Link}
          to={{ pathname: `/review/${item.id}`, search }}
          preventScrollReset
          selected={item.id === selectedId}
          aria-current={item.id === selectedId ? "true" : undefined}
          sx={{ borderRadius: 2, alignItems: "flex-start", py: 1.25, px: 1.5 }}
        >
          <Stack spacing={0.75} sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={1.5} sx={{ justifyContent: "space-between" }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {itemTitle(item)}
              </Typography>
              <Typography
                variant="body2"
                sx={[Styled.Mono, { flexShrink: 0, color: "text.secondary" }]}
              >
                {item.total_amount === null ? "" : formatMoney(item.total_amount, item.currency)}
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {[
                item.invoice_number && `No. ${item.invoice_number}`,
                formatDateTime(item.received_at),
              ]
                .filter(Boolean)
                .join(" · ")}
            </Typography>
            {item.status === "open" && <ReasonChips reasons={item.review_reasons} />}
          </Stack>
        </ListItemButton>
      ))}
    </List>
  );
}
