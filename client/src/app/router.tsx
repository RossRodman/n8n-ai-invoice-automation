import { createBrowserRouter, type RouteObject } from "react-router";

import { SiteChrome } from "@/components/layout";
import { DashboardPage, HowItWorksPage, InvoicesPage, NotFoundPage, ReviewPage } from "@/features";

export const routes: RouteObject[] = [
  {
    element: <SiteChrome />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "invoices/:id?", element: <InvoicesPage /> },
      { path: "review/:id?", element: <ReviewPage /> },
      { path: "how-it-works", element: <HowItWorksPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
