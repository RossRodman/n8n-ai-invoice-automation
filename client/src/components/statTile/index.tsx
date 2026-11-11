import { Box, Card, Skeleton, Stack, Typography } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import type { ReactNode } from "react";

import { Styled } from "@/styled";

interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: SvgIconComponent;
  tone?: "primary" | "warning" | "success";
  loading?: boolean;
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  loading,
}: StatTileProps) {
  return (
    <Card component="article" aria-label={label} sx={{ p: 2, height: "100%" }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Box
          sx={{
            display: "grid",
            placeItems: "center",
            width: 32,
            height: 32,
            borderRadius: 1.5,
            color: `${tone}.main`,
            bgcolor: `rgb(var(--mui-palette-${tone}-mainChannel) / 0.1)`,
          }}
        >
          <Icon sx={{ fontSize: 18 }} />
        </Box>
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
          {label}
        </Typography>
      </Stack>

      <Typography
        component="p"
        sx={[
          Styled.Mono,
          { mt: 1.25, fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em" },
        ]}
      >
        {loading ? <Skeleton width="70%" /> : value}
      </Typography>

      <Typography
        variant="body2"
        sx={[{ color: "text.secondary", mt: 0.5, minHeight: 20 }, Styled.HideWhenShort]}
      >
        {loading ? <Skeleton width="50%" /> : hint}
      </Typography>
    </Card>
  );
}
