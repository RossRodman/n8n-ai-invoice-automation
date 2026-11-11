import { Box, Container, Drawer } from "@mui/material";
import { useState } from "react";
import { Outlet, ScrollRestoration } from "react-router";

import { Footer } from "../footer";
import { Header } from "../header";
import { Sidebar, SIDEBAR_WIDTH } from "../sidebar";

export function SiteChrome() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh", height: { md: "100dvh" } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={closeMobile}
        sx={{ display: { md: "none" }, "& .MuiDrawer-paper": { width: SIDEBAR_WIDTH } }}
      >
        <Sidebar onNavigate={closeMobile} />
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": { width: SIDEBAR_WIDTH, boxSizing: "border-box" },
        }}
      >
        <Sidebar />
      </Drawer>

      <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, minHeight: 0 }}>
        <Header onOpenMenu={() => setMobileOpen(true)} />

        <Container
          component="main"
          maxWidth="lg"
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            py: 3,
            overflowY: { md: "auto" },
          }}
        >
          <Outlet />
        </Container>

        <Footer />
      </Box>

      <ScrollRestoration />
    </Box>
  );
}
