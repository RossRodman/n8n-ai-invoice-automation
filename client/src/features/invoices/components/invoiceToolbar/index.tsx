import SearchRounded from "@mui/icons-material/SearchRounded";
import { InputAdornment, MenuItem, Stack, TextField } from "@mui/material";
import { useEffect, useState } from "react";

interface InvoiceToolbarProps {
  search: string;
  currency: string | null;
  currencies: string[];
  onSearch: (search: string) => void;
  onCurrency: (currency: string | null) => void;
}

const ALL = "all";

export function InvoiceToolbar({
  search,
  currency,
  currencies,
  onSearch,
  onCurrency,
}: InvoiceToolbarProps) {
  const [draft, setDraft] = useState(search);
  const [synced, setSynced] = useState(search);

  if (search !== synced) {
    setSynced(search);
    setDraft(search);
  }

  useEffect(() => {
    if (draft === search) return;
    const timer = setTimeout(() => onSearch(draft), 250);

    return () => clearTimeout(timer);
  }, [draft, search, onSearch]);

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
      <TextField
        size="small"
        type="search"
        placeholder="Supplier, tax ID, invoice number, file…"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        sx={{ flex: 1, maxWidth: { sm: 420 } }}
        slotProps={{
          htmlInput: { "aria-label": "Search invoices" },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      <TextField
        select
        size="small"
        label="Currency"
        value={currency ?? ALL}
        onChange={(event) => onCurrency(event.target.value === ALL ? null : event.target.value)}
        sx={{ minWidth: 160 }}
      >
        <MenuItem value={ALL}>All currencies</MenuItem>
        {currencies.map((code) => (
          <MenuItem key={code} value={code}>
            {code}
          </MenuItem>
        ))}
        {currency && !currencies.includes(currency) && (
          <MenuItem value={currency}>{currency}</MenuItem>
        )}
      </TextField>
    </Stack>
  );
}
