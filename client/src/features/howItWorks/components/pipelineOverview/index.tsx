import { Box, Card, Stack, Typography } from "@mui/material";

import { Styled } from "@/styled";

import { PIPELINE_STEPS } from "./steps";

export function PipelineOverview() {
  return (
    <Box component="section" aria-labelledby="pipeline-title">
      <Typography id="pipeline-title" variant="h3" component="h2">
        How an invoice moves
      </Typography>
      <Typography sx={Styled.SectionDescription}>
        One n8n workflow, five steps. Each PDF is handled on its own.
      </Typography>

      <Box
        component="ol"
        sx={{
          listStyle: "none",
          p: 0,
          m: 0,
          mt: 3,
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(5, 1fr)" },
        }}
      >
        {PIPELINE_STEPS.map(({ title, detail, icon: Icon }, index) => (
          <Card component="li" key={title} sx={{ p: 2.5 }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Box
                sx={{
                  display: "grid",
                  placeItems: "center",
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  color: "primary.main",
                  bgcolor: "rgb(var(--mui-palette-primary-mainChannel) / 0.1)",
                }}
              >
                <Icon fontSize="small" />
              </Box>
              <Typography variant="caption" sx={[Styled.Mono, { color: "text.disabled" }]}>
                {String(index + 1).padStart(2, "0")}
              </Typography>
            </Stack>
            <Typography variant="h4" component="h3" sx={{ mt: 2 }}>
              {title}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              {detail}
            </Typography>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
