import ReceiptLongRounded from "@mui/icons-material/ReceiptLongRounded";
import { Box, Stack, Typography } from "@mui/material";
import { Link } from "react-router";

export function Logo() {
  return (
    <Stack
      component={Link}
      to="/"
      direction="row"
      spacing={1.5}
      sx={{ alignItems: "center", color: "inherit", textDecoration: "none" }}
    >
      <Box
        sx={{
          display: "grid",
          placeItems: "center",
          width: 36,
          height: 36,
          borderRadius: 2.5,
          color: "primary.contrastText",
          background: "linear-gradient(135deg, #6366f1, #0d9488)",
        }}
      >
        <ReceiptLongRounded fontSize="small" />
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 650, lineHeight: 1.2 }}>Invoice Desk</Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          AI invoice automation
        </Typography>
      </Box>
    </Stack>
  );
}
