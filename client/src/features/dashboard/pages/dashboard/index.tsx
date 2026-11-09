import { Stack } from "@mui/material";

import { HeroSection, PipelineOverview } from "../../components";

export function DashboardPage() {
  return (
    <Stack spacing={{ xs: 5, md: 7 }}>
      <HeroSection />
      <PipelineOverview />
    </Stack>
  );
}
