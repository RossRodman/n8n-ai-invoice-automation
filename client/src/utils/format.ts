const LOCALE = "en-US";

const moneyFormatters = new Map<string, Intl.NumberFormat>();
const plainNumber = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function moneyFormatter(currency: string, whole: boolean): Intl.NumberFormat | null {
  const key = `${currency}:${whole}`;
  if (!moneyFormatters.has(key)) {
    try {
      moneyFormatters.set(
        key,
        new Intl.NumberFormat(LOCALE, {
          style: "currency",
          currency,
          currencyDisplay: "code",
          minimumFractionDigits: whole ? 0 : 2,
          maximumFractionDigits: whole ? 0 : 2,
        }),
      );
    } catch {
      return null;
    }
  }

  return moneyFormatters.get(key) ?? null;
}

export function formatMoney(
  value: number | null,
  currency: string | null,
  { whole = false }: { whole?: boolean } = {},
): string {
  if (value === null) return "—";
  const formatter = currency ? moneyFormatter(currency, whole) : null;
  if (formatter) return formatter.format(value).replace(/ /g, " ");

  return currency ? `${plainNumber.format(value)} ${currency}` : plainNumber.format(value);
}

export function formatCompactMoney(value: number, currency: string): string {
  const compact = new Intl.NumberFormat(LOCALE, {
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);

  return `${currency} ${compact}`;
}

export function formatPercent(value: number | null, { fraction = false } = {}): string {
  if (value === null) return "—";
  const percent = fraction ? value * 100 : value;

  return `${Number.isInteger(percent) ? percent : percent.toFixed(1)}%`;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const match = ISO_DATE.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;

  return dateFormatter.format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))));
}

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}

const monthFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

export function formatMonth(month: string): string {
  const [year, index] = month.split("-").map(Number);

  return monthFormatter.format(new Date(Date.UTC(year ?? 1970, (index ?? 1) - 1, 1)));
}
