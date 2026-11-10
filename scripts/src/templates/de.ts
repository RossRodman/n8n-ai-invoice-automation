import type { Line, SampleInvoice } from "../data.ts";
import { decimal, escapeHtml as esc, ibanGroups, moneyDe } from "../format.ts";

const CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: 11px; color: #222; }
.page { width: 794px; height: 1123px; padding: 56px 64px; position: relative; }
.head { display: flex; justify-content: space-between; align-items: flex-start; }
.brand { font-size: 22px; font-weight: 700; color: var(--accent); letter-spacing: -0.01em; }
.brand small { display: block; font-size: 10px; font-weight: 400; color: #666;
               letter-spacing: 0.08em; text-transform: uppercase; margin-top: 4px; }
.contact { text-align: right; color: #555; line-height: 1.5; font-size: 10px; }
.window { margin-top: 44px; width: 320px; }
.sender { font-size: 8.5px; color: #777; border-bottom: 1px solid #bbb;
          padding-bottom: 3px; margin-bottom: 8px; }
.window p { margin: 0; line-height: 1.5; font-size: 12px; }
.meta { position: absolute; right: 64px; top: 168px; width: 250px; border-collapse: collapse; }
.meta td { padding: 3px 0; }
.meta td:last-child { text-align: right; font-weight: 700; }
h1 { font-size: 24px; margin: 64px 0 4px; font-weight: 400; }
.lead { color: #555; margin-bottom: 18px; }
.meta, .items, .sum, .footer { font-family: "Helvetica Neue", Arial, sans-serif; }
.items { width: 100%; border-collapse: collapse; }
.items th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em;
            color: #555; border-bottom: 2px solid var(--accent); padding: 8px 6px; }
.items td { padding: 9px 6px; border-bottom: 1px solid #e3e3e3; }
.items .r { text-align: right; white-space: nowrap; }
.sum { margin-left: auto; width: 300px; margin-top: 14px; border-collapse: collapse; }
.sum td { padding: 4px 6px; }
.sum td:last-child { text-align: right; }
.sum tr.grand td { font-weight: 700; font-size: 13px; border-top: 2px solid #222; padding-top: 8px; }
.pay { margin-top: 30px; line-height: 1.6; }
.footer { position: absolute; left: 64px; right: 64px; bottom: 44px; display: grid;
          grid-template-columns: repeat(3, 1fr); gap: 16px; font-size: 9px; color: #666;
          border-top: 1px solid #ccc; padding-top: 10px; line-height: 1.5; }
`;

function lineRow(line: Line, index: number): string {
  return `<tr>
    <td>${index + 1}</td><td>${esc(line.description)}</td>
    <td class="r">${decimal(line.quantity)} ${esc(line.unit)}</td>
    <td class="r">${moneyDe(line.unitPrice)}</td><td class="r">${moneyDe(line.amount)}</td>
  </tr>`;
}

/** A German "Rechnung" with a letterhead and an address window. */
export function renderDe(inv: SampleInvoice): string {
  const { supplier: s, buyer: b } = inv;
  const sender = [s.name, ...s.address.slice(0, 2)].map(esc).join(" · ");

  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>Rechnung ${esc(inv.number)}</title>
<style>${CSS}</style></head>
<body style="--accent: ${inv.accent}"><div class="page">
  <div class="head">
    <div class="brand">${esc(s.name)}<small>Büroeinrichtung · Ergonomie · Montage</small></div>
    <div class="contact">${s.address.map(esc).join("<br>")}<br>
      Tel. +49 40 3289 5510<br>rechnung@nordlicht-buero.de</div>
  </div>

  <div class="window">
    <div class="sender">${sender}</div>
    <p><b>${esc(b.name)}</b></p><p>Einkauf</p>
    ${b.address.map((line) => `<p>${esc(line)}</p>`).join("")}
  </div>

  <table class="meta">
    <tr><td>Rechnungsnummer</td><td>${esc(inv.number)}</td></tr>
    <tr><td>Rechnungsdatum</td><td>${esc(inv.printedDate)}</td></tr>
    <tr><td>Lieferdatum</td><td>${esc(inv.printedDate)}</td></tr>
    <tr><td>Fällig am</td><td>${esc(inv.printedDueDate)}</td></tr>
    <tr><td>Kundennummer</td><td>K-20419</td></tr>
    <tr><td>Ihre USt-IdNr.</td><td>${esc(b.taxId)}</td></tr>
  </table>

  <h1>Rechnung</h1>
  <div class="lead">Vielen Dank für Ihren Auftrag. Wir berechnen Ihnen folgende Leistungen:</div>

  <table class="items">
    <thead><tr>
      <th style="width:40px">Pos.</th><th>Beschreibung</th><th class="r">Menge</th>
      <th class="r">Einzelpreis</th><th class="r">Gesamt</th>
    </tr></thead>
    <tbody>${inv.lines.map(lineRow).join("")}</tbody>
  </table>

  <table class="sum">
    <tr><td>Nettobetrag</td><td>${moneyDe(inv.netAmount)}</td></tr>
    <tr><td>zzgl. ${decimal(inv.vatRate)} % MwSt.</td><td>${moneyDe(inv.vatAmount)}</td></tr>
    <tr class="grand"><td>Gesamtbetrag</td><td>${moneyDe(inv.totalAmount)}</td></tr>
  </table>

  <div class="pay">Bitte überweisen Sie den Gesamtbetrag ohne Abzug bis zum
    <b>${esc(inv.printedDueDate)}</b> unter Angabe der Rechnungsnummer.</div>

  <div class="footer">
    <div>${[s.name, ...s.address.slice(0, 2)].map(esc).join("<br>")}</div>
    <div>${esc(s.bank ?? "")}<br>IBAN ${ibanGroups(s.iban ?? "")}<br>BIC COBADEFFXXX</div>
    <div>${[...(s.extra ?? []), `USt-IdNr. ${s.taxId}`].map(esc).join("<br>")}</div>
  </div>
</div></body></html>`;
}
