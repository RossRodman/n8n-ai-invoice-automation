import type { SxProps, Theme } from "@mui/material/styles";

import { MONO } from "@/app/theme";

export const Styled = {
  HideWhenShort: { "@media (max-height: 780px)": { display: "none" } },
  Eyebrow: { color: "primary.main", display: "block" },
  PageLead: { color: "text.secondary", fontSize: "1.125rem", maxWidth: 640, textWrap: "pretty" },
  SectionDescription: { color: "text.secondary", mt: 0.5 },
  Mono: { fontFamily: MONO, fontVariantNumeric: "tabular-nums" },
  Panel: { p: 2.5, height: "100%", minHeight: 0, display: "flex", flexDirection: "column" },
  PanelBody: { flex: 1, minHeight: 0, overflowY: "auto" },
  VisuallyHidden: {
    position: "absolute",
    width: 1,
    height: 1,
    p: 0,
    m: -1,
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    whiteSpace: "nowrap",
    border: 0,
  },
} satisfies Record<string, SxProps<Theme>>;
