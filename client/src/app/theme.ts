import { alpha, createTheme } from "@mui/material/styles";

const SANS = '"Inter Variable", ui-sans-serif, system-ui, sans-serif';
export const MONO = '"JetBrains Mono Variable", ui-monospace, monospace';

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "data-color-scheme" },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#4f46e5" },
        secondary: { main: "#0d9488" },
        success: { main: "#16a34a" },
        warning: { main: "#d97706" },
        error: { main: "#dc2626" },
        background: { default: "#f6f7fb", paper: "#ffffff" },
        text: { primary: "#0f172a", secondary: "#475569" },
        divider: "#e2e8f0",
      },
    },
    dark: {
      palette: {
        primary: { main: "#818cf8" },
        secondary: { main: "#2dd4bf" },
        success: { main: "#4ade80" },
        warning: { main: "#fbbf24" },
        error: { main: "#f87171" },
        background: { default: "#0b0d12", paper: "#12151c" },
        text: { primary: "#e8eaf0", secondary: "#9aa1b2" },
        divider: "#262b36",
      },
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: SANS,
    h1: { fontSize: "2.5rem", fontWeight: 650, letterSpacing: "-0.03em", lineHeight: 1.1 },
    h2: { fontSize: "1.75rem", fontWeight: 650, letterSpacing: "-0.02em" },
    h3: { fontSize: "1.25rem", fontWeight: 600, letterSpacing: "-0.01em" },
    h4: { fontSize: "1rem", fontWeight: 600 },
    overline: { fontWeight: 600, letterSpacing: "0.08em", lineHeight: 1.5 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiCard: {
      defaultProps: { variant: "outlined" },
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 500 } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
          "&.active": {
            color: theme.vars.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            "& .MuiListItemIcon-root": { color: "inherit" },
          },
        }),
      },
    },
  },
});
