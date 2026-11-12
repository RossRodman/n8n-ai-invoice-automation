import MenuRounded from "@mui/icons-material/MenuRounded";
import UploadFileRounded from "@mui/icons-material/UploadFileRounded";
import { AppBar, Box, Button, IconButton, Stack, Toolbar, Tooltip } from "@mui/material";
import { useState } from "react";

import { UploadDialog } from "@/components/uploadDialog";
import { useHealth } from "@/hooks/useHealth";

import { SourceLink } from "./sourceLink";
import { StatusPill } from "./statusPill";
import { ThemeToggle } from "./themeToggle";

interface HeaderProps {
  onOpenMenu: () => void;
}

export function Header({ onOpenMenu }: HeaderProps) {
  const health = useHealth();
  const [uploading, setUploading] = useState(false);

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
          <Button
            variant="contained"
            size="small"
            startIcon={<UploadFileRounded />}
            onClick={() => setUploading(true)}
            sx={{ display: { xs: "none", sm: "inline-flex" }, ml: "12px !important" }}
          >
            Upload PDF
          </Button>
          <Tooltip title="Upload PDF">
            <IconButton
              aria-label="Upload PDF"
              color="primary"
              onClick={() => setUploading(true)}
              sx={{ display: { sm: "none" } }}
            >
              <UploadFileRounded />
            </IconButton>
          </Tooltip>
        </Stack>
      </Toolbar>

      <UploadDialog open={uploading} onClose={() => setUploading(false)} />
    </AppBar>
  );
}
