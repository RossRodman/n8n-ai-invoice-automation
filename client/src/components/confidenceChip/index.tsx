import { Box, Stack, Typography } from "@mui/material";

import { Styled } from "@/styled";
import { formatPercent } from "@/utils/format";

export const MIN_CONFIDENCE = 0.8;

function tone(confidence: number) {
  if (confidence >= 0.9) return "success.main";
  if (confidence >= MIN_CONFIDENCE) return "warning.main";

  return "error.main";
}

interface ConfidenceChipProps {
  value: number | null;
}

export function ConfidenceChip({ value }: ConfidenceChipProps) {
  if (value === null) {
    return <Typography sx={{ color: "text.disabled" }}>—</Typography>;
  }

  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{ alignItems: "center", display: "inline-flex" }}
      title="How sure the model was about the fields it read"
    >
      <Box
        aria-hidden
        sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: tone(value), flexShrink: 0 }}
      />
      <Typography variant="body2" component="span" sx={Styled.Mono}>
        {formatPercent(Math.round(value * 100))}
      </Typography>
    </Stack>
  );
}
