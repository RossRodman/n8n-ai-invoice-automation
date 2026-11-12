import { Box, Stack, Typography } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: SvgIconComponent;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, children, action }: EmptyStateProps) {
  return (
    <Stack
      spacing={1.5}
      sx={{ alignItems: "center", textAlign: "center", py: { xs: 6, md: 3 }, px: 3 }}
    >
      <Box
        sx={{
          display: "grid",
          placeItems: "center",
          width: 48,
          height: 48,
          borderRadius: "50%",
          color: "text.secondary",
          bgcolor: "action.hover",
        }}
      >
        <Icon />
      </Box>
      <Typography variant="h4" component="p">
        {title}
      </Typography>
      {children && (
        <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 420 }}>
          {children}
        </Typography>
      )}
      {action}
    </Stack>
  );
}
