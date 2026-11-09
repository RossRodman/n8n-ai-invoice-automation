import { createBrowserRouter, type RouteObject } from "react-router";

import { SiteChrome } from "@/components/layout";
import { DashboardPage, NotFoundPage } from "@/features";

export const routes: RouteObject[] = [
  {
    element: <SiteChrome />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
