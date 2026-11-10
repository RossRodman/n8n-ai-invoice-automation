function grouped(value: number, thousands: string): string {
  const [whole = "0", cents = "00"] = Math.abs(value).toFixed(2).split(".");
  const withGroups = whole.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);

  return `${value < 0 ? "-" : ""}${withGroups},${cents}`;
}

export function moneyUa(value: number): string {
  return grouped(value, " ");
}

export function moneyDe(value: number): string {
  return `${grouped(value, ".")} €`;
}

export function decimal(value: number): string {
  return String(value).replace(".", ",");
}

export function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function ibanGroups(iban: string): string {
  return iban.replace(/(.{4})(?=.)/g, "$1 ");
}
