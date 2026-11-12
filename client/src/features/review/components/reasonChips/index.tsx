import { Chip, Stack } from "@mui/material";

import { reviewReasonLabel } from "@/constants";

interface ReasonChipsProps {
  reasons: string[];
  size?: "small" | "medium";
}

export function ReasonChips({ reasons, size = "small" }: ReasonChipsProps) {
  if (!reasons.length) return null;

  return (
    <Stack direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: "wrap" }}>
      {reasons.map((reason) => (
        <Chip
          key={reason}
          size={size}
          label={reviewReasonLabel(reason)}
          sx={{
            height: size === "small" ? 22 : undefined,
            color: "warning.dark",
            bgcolor: "rgb(var(--mui-palette-warning-mainChannel) / 0.12)",
            '[data-color-scheme="dark"] &': { color: "warning.light" },
          }}
        />
      ))}
    </Stack>
  );
}
