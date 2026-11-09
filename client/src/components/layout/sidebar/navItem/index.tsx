import { ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { NavLink } from "react-router";

import type { NavItem as NavItemConfig } from "@/constants";

interface NavItemProps {
  item: NavItemConfig;
  onClick?: () => void;
}

export function NavItem({ item: { to, label, icon: Icon }, onClick }: NavItemProps) {
  return (
    <ListItemButton component={NavLink} to={to} end={to === "/"} onClick={onClick}>
      <ListItemIcon sx={{ minWidth: 36 }}>
        <Icon fontSize="small" />
      </ListItemIcon>
      <ListItemText primary={label} slotProps={{ primary: { sx: { fontWeight: 500 } } }} />
    </ListItemButton>
  );
}
