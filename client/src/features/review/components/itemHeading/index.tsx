import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import { Button, Stack, Typography } from "@mui/material";

import type { ReviewItem } from "@/types";
import { formatDateTime } from "@/utils/format";
import { itemTitle } from "@/utils/review";

import { ReasonChips } from "../reasonChips";

export function ItemHeading({ item }: { item: ReviewItem }) {
  return (
    <Stack spacing={1.25}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ justifyContent: "space-between", alignItems: { sm: "flex-start" } }}
      >
        <div>
          <Typography id="review-item-title" variant="h3" component="h2">
            {itemTitle(item)}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {[
              item.file_name,
              item.email_from && `from ${item.email_from}`,
              formatDateTime(item.received_at),
            ]
              .filter(Boolean)
              .join(" · ")}
          </Typography>
        </div>
        {item.email_link && (
          <Button
            size="small"
            variant="outlined"
            href={item.email_link}
            target="_blank"
            rel="noreferrer"
            endIcon={<OpenInNewRounded />}
            sx={{ flexShrink: 0, alignSelf: { xs: "flex-start" } }}
          >
            Open the email
          </Button>
        )}
      </Stack>
      <ReasonChips reasons={item.review_reasons} size="medium" />
    </Stack>
  );
}
