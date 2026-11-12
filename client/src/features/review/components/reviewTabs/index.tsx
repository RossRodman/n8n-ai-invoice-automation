import { Box, Tab, Tabs } from "@mui/material";

import { Styled } from "@/styled";
import type { ReviewStatus } from "@/types";

const STATUS_LABELS: Record<ReviewStatus, string> = {
  open: "Open",
  approved: "Approved",
  rejected: "Rejected",
};

interface ReviewTabsProps {
  value: ReviewStatus;
  counts: Record<ReviewStatus, number> | undefined;
  onChange: (status: ReviewStatus) => void;
}

export function ReviewTabs({ value, counts, onChange }: ReviewTabsProps) {
  return (
    <Tabs
      value={value}
      onChange={(_event, status: ReviewStatus) => onChange(status)}
      aria-label="Review status"
      sx={{ minHeight: 40, "& .MuiTab-root": { minHeight: 40, px: 1.5, minWidth: 0 } }}
    >
      {(Object.keys(STATUS_LABELS) as ReviewStatus[]).map((status) => (
        <Tab
          key={status}
          value={status}
          label={
            <span>
              {STATUS_LABELS[status]}
              {counts && (
                <Box
                  component="span"
                  sx={[
                    Styled.Mono,
                    {
                      ml: 1,
                      px: 0.75,
                      py: 0.125,
                      borderRadius: 1,
                      fontSize: "0.75rem",
                      bgcolor:
                        status === "open" && counts.open > 0
                          ? "rgb(var(--mui-palette-warning-mainChannel) / 0.16)"
                          : "action.hover",
                    },
                  ]}
                >
                  {counts[status]}
                </Box>
              )}
            </span>
          }
        />
      ))}
    </Tabs>
  );
}
