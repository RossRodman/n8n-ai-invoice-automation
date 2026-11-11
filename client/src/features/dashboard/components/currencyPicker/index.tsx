import { ToggleButton, ToggleButtonGroup } from "@mui/material";

interface CurrencyPickerProps {
  currencies: string[];
  value: string;
  onChange: (currency: string) => void;
}

export function CurrencyPicker({ currencies, value, onChange }: CurrencyPickerProps) {
  if (currencies.length < 2) return null;

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_, next: string | null) => next && onChange(next)}
      aria-label="Currency"
    >
      {currencies.map((code) => (
        <ToggleButton key={code} value={code} sx={{ px: 1.5, fontWeight: 600 }}>
          {code}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
