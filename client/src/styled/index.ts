import type { SxProps, Theme } from "@mui/material/styles";

import { MONO } from "@/app/theme";

export const Styled = {
  Eyebrow: { color: "primary.main", display: "block" },
  PageLead: { color: "text.secondary", fontSize: "1.125rem", maxWidth: 640, textWrap: "pretty" },
  SectionDescription: { color: "text.secondary", mt: 0.5 },
  Mono: { fontFamily: MONO, fontVariantNumeric: "tabular-nums" },
} satisfies Record<string, SxProps<Theme>>;
