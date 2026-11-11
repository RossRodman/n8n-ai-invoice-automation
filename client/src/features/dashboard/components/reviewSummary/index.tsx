import TaskAltRounded from "@mui/icons-material/TaskAltRounded";
import { Alert, Box, Card, Skeleton, Stack, Typography } from "@mui/material";

import { EmptyState } from "@/components/emptyState";
import { SectionHeader } from "@/components/sectionHeader";
import { reviewReasonLabel } from "@/constants";
import { Styled } from "@/styled";
import type { ReviewItem } from "@/types";
import { countReasons } from "@/utils/review";

interface ReviewSummaryProps {
  items: ReviewItem[] | undefined;
  error: Error | null;
}

export function ReviewSummary({ items, error }: ReviewSummaryProps) {
  const reasons = items ? countReasons(items) : [];

  return (
    <Card component="section" aria-labelledby="review-title" sx={Styled.Panel}>
      <SectionHeader
        id="review-title"
        title="Needs a person"
        description="Why open invoices were held back"
      />

      {error ? (
        <Alert severity="error" variant="outlined" sx={{ mt: 2 }}>
          {error.message}
        </Alert>
      ) : !items ? (
        <Stack spacing={1} sx={{ mt: 2 }}>
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} variant="rounded" height={36} />
          ))}
        </Stack>
      ) : items.length === 0 ? (
        <EmptyState icon={TaskAltRounded} title="Nothing waiting">
          Every invoice so far passed the checks.
        </EmptyState>
      ) : (
        <Stack
          component="ul"
          spacing={1}
          sx={[Styled.PanelBody, { listStyle: "none", p: 0, m: 0, mt: 2 }]}
        >
          {reasons.map(([reason, count]) => (
            <Stack
              component="li"
              key={reason}
              direction="row"
              sx={{
                alignItems: "center",
                justifyContent: "space-between",
                px: 1.5,
                py: 1,
                borderRadius: 2,
                bgcolor: "rgb(var(--mui-palette-warning-mainChannel) / 0.08)",
              }}
            >
              <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                <Box
                  aria-hidden
                  sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "warning.main" }}
                />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {reviewReasonLabel(reason)}
                </Typography>
              </Stack>
              <Typography variant="body2" sx={[Styled.Mono, { fontWeight: 600 }]}>
                {count}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Card>
  );
}
