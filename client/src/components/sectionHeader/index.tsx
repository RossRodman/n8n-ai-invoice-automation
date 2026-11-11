import { Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

import { Styled } from "@/styled";

interface SectionHeaderProps {
  id: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}

export function SectionHeader({ id, title, description, action }: SectionHeaderProps) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
    >
      <div>
        <Typography id={id} variant="h4" component="h3">
          {title}
        </Typography>
        {description && (
          <Typography
            variant="body2"
            sx={[{ color: "text.secondary", mt: 0.25 }, Styled.HideWhenShort]}
          >
            {description}
          </Typography>
        )}
      </div>
      {action}
    </Stack>
  );
}
