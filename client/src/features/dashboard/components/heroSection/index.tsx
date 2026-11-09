import { Stack, Typography } from "@mui/material";

import { Styled } from "@/styled";

export function HeroSection() {
  return (
    <Stack spacing={2}>
      <Typography variant="overline" sx={Styled.Eyebrow}>
        n8n · OpenAI · Gmail · Google Sheets · Slack
      </Typography>
      <Typography variant="h1">Invoices in, bookkeeping out.</Typography>
      <Typography sx={Styled.PageLead}>
        An invoice arrives in Gmail, AI reads the PDF and pulls out the supplier, amounts, dates and
        VAT. The row lands in Google Sheets and the team gets a Slack message. Anything the workflow
        isn't sure about waits here for a person instead of going into the books.
      </Typography>
    </Stack>
  );
}
