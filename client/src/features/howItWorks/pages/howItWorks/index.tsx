import { Stack } from "@mui/material";

import { HeroSection, PipelineOverview } from "../../components";

export function HowItWorksPage() {
  return (
    <Stack spacing={{ xs: 5, md: 6 }} sx={{ py: { md: 2 } }}>
      <HeroSection />
      <PipelineOverview />
    </Stack>
  );
}
