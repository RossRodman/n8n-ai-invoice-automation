import { describe, expect, it } from "vitest";

import {
  formatCompactMoney,
  formatDate,
  formatMoney,
  formatMonth,
  formatPercent,
} from "@/utils/format";

describe("formatMoney", () => {
  it("shows the amount with its currency code", () => {
    expect(formatMoney(12000, "UAH")).toBe("UAH 12,000.00");
    expect(formatMoney(1873.06, "EUR")).toBe("EUR 1,873.06");
    expect(formatMoney(23400.4, "UAH", { whole: true })).toBe("UAH 23,400");
  });

  it("copes with a missing or unknown currency", () => {
    expect(formatMoney(10, null)).toBe("10.00");
    expect(formatMoney(10, "грн")).toBe("10.00 грн");
    expect(formatMoney(null, "UAH")).toBe("—");
  });
});

describe("formatCompactMoney", () => {
  it("shortens large amounts", () => {
    expect(formatCompactMoney(45600, "UAH")).toBe("UAH 45.6K");
    expect(formatCompactMoney(0, "EUR")).toBe("EUR 0");
  });
});

describe("formatPercent", () => {
  it("shows whole and fractional rates", () => {
    expect(formatPercent(20)).toBe("20%");
    expect(formatPercent(7.5)).toBe("7.5%");
    expect(formatPercent(0.96, { fraction: true })).toBe("96%");
    expect(formatPercent(null)).toBe("—");
  });
});

describe("formatDate", () => {
  it("keeps the calendar date whatever the time zone", () => {
    expect(formatDate("2026-11-03")).toBe("Nov 3, 2026");
    expect(formatDate("2026-01-01")).toBe("Jan 1, 2026");
  });

  it("leaves text it can't read alone", () => {
    expect(formatDate("03.11.2026")).toBe("03.11.2026");
    expect(formatDate(null)).toBe("—");
  });
});

describe("formatMonth", () => {
  it("names the month", () => {
    expect(formatMonth("2026-11")).toBe("Nov 26");
  });
});
