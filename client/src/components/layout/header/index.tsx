import MenuRounded from "@mui/icons-material/MenuRounded";
import { AppBar, Box, IconButton, Stack, Toolbar } from "@mui/material";

import { useHealth } from "@/hooks/useHealth";

import { SourceLink } from "./sourceLink";
import { StatusPill } from "./statusPill";
import { ThemeToggle } from "./themeToggle";

interface HeaderProps {
  onOpenMenu: () => void;
}

export function Header({ onOpenMenu }: HeaderProps) {
  const health = useHealth();

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "rgb(var(--mui-palette-background-defaultChannel) / 0.8)",
        backdropFilter: "blur(8px)",
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <IconButton
          edge="start"
          aria-label="Open menu"
          onClick={onOpenMenu}
          sx={{ display: { md: "none" } }}
        >
          <MenuRounded />
        </IconButton>

        <Box sx={{ flex: 1 }} />

        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <StatusPill state={health} />
          <ThemeToggle />
          <SourceLink />
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
