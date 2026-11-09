import { Box, List, Stack } from "@mui/material";

import { NAV_ITEMS } from "@/constants";

import { Logo } from "./logo";
import { N8nLink } from "./n8nLink";
import { NavItem } from "./navItem";

export const SIDEBAR_WIDTH = 248;

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <Stack sx={{ height: "100%", p: 2 }}>
      <Box sx={{ px: 1, py: 1.5 }}>
        <Logo />
      </Box>

      <Box component="nav" aria-label="Main" sx={{ mt: 2, flex: 1 }}>
        <List disablePadding sx={{ display: "grid", gap: 0.5 }}>
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} item={item} onClick={onNavigate} />
          ))}
        </List>
      </Box>

      <N8nLink />
    </Stack>
  );
}
