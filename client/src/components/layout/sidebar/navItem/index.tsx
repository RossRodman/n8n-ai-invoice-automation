import { Box, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { NavLink } from "react-router";

import type { NavItem as NavItemConfig } from "@/constants";
import { Styled } from "@/styled";

interface NavItemProps {
  item: NavItemConfig;
  count?: number;
  onClick?: () => void;
}

export function NavItem({ item: { to, label, icon: Icon }, count, onClick }: NavItemProps) {
  return (
    <ListItemButton component={NavLink} to={to} end={to === "/"} onClick={onClick}>
      <ListItemIcon sx={{ minWidth: 36 }}>
        <Icon fontSize="small" />
      </ListItemIcon>
      <ListItemText primary={label} slotProps={{ primary: { sx: { fontWeight: 500 } } }} />
      {Boolean(count) && (
        <Box
          component="span"
          aria-label={`${count} open`}
          sx={[
            Styled.Mono,
            {
              minWidth: 22,
              px: 0.75,
              borderRadius: 11,
              fontSize: "0.75rem",
              fontWeight: 600,
              lineHeight: "22px",
              textAlign: "center",
              color: "warning.contrastText",
              bgcolor: "warning.main",
            },
          ]}
        >
          {count}
        </Box>
      )}
    </ListItemButton>
  );
}
