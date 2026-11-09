import { CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { RouterProvider } from "react-router/dom";

import { createQueryClient } from "@/app/queryClient";
import { router as browserRouter } from "@/app/router";
import { theme } from "@/app/theme";

type Router = typeof browserRouter;

interface AppProps {
  router?: Router;
}

export function App({ router = browserRouter }: AppProps) {
  const [queryClient] = useState(createQueryClient);

  return (
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline enableColorScheme />

      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
