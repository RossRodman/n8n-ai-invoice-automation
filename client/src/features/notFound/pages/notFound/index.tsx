import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import { Button, Stack, Typography } from "@mui/material";
import { Link } from "react-router";

import { Styled } from "@/styled";

interface NotFoundPageProps {
  title?: string;
  detail?: string;
}

export function NotFoundPage({
  title = "Page not found",
  detail = "There's nothing at this address.",
}: NotFoundPageProps) {
  return (
    <Stack spacing={2} sx={{ alignItems: "flex-start", py: 8 }}>
      <Typography variant="overline" sx={[Styled.Eyebrow, Styled.Mono]}>
        404
      </Typography>
      <Typography variant="h2" component="h1">
        {title}
      </Typography>
      <Typography sx={{ color: "text.secondary" }}>{detail}</Typography>
      <Button component={Link} to="/" startIcon={<ArrowBackRounded />}>
        Back to the dashboard
      </Button>
    </Stack>
  );
}
