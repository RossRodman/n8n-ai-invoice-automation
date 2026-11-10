import type { Line, Party, SampleInvoice } from "../data.ts";
import { decimal, escapeHtml as esc, ibanGroups, moneyUa } from "../format.ts";

const CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "Helvetica Neue", Arial, sans-serif; font-size: 11px; color: #1a1a1a; }
.page { width: 794px; height: 1123px; padding: 48px 56px; position: relative; }
.bar { height: 6px; background: var(--accent); margin: -48px -56px 36px; }
.party { display: grid; grid-template-columns: 110px 1fr; gap: 3px 12px; margin: 0 0 18px; }
.party dt { color: #666; }
.party dd { margin: 0; }
.party .name { font-weight: 700; font-size: 12px; }
h1 { font-size: 19px; text-align: center; margin: 26px 0 6px; }
.subtitle { text-align: center; color: #555; margin-bottom: 26px; }
table { width: 100%; border-collapse: collapse; margin-top: 8px; }
th, td { border: 1px solid #9a9a9a; padding: 6px 8px; vertical-align: top; }
th { background: #f1f1f1; font-weight: 600; text-align: center; }
td.num { text-align: right; white-space: nowrap; }
td.c { text-align: center; }
.totals { margin-left: auto; width: 320px; margin-top: 10px; border-collapse: collapse; }
.totals td { border: none; padding: 3px 0; }
.totals td:last-child { text-align: right; font-weight: 600; }
.totals tr.grand td { font-size: 13px; border-top: 1.5px solid #1a1a1a; padding-top: 6px; }
.words { margin-top: 20px; line-height: 1.6; }
.words b { display: block; }
.note { margin-top: 10px; padding: 8px 12px; background: #f6f3ff; border-left: 3px solid var(--accent); }
.sign { position: absolute; left: 56px; right: 56px; bottom: 90px; display: flex;
        justify-content: space-between; align-items: flex-end; }
.sign div { display: flex; align-items: flex-end; }
.sign .line { border-bottom: 1px solid #1a1a1a; width: 180px; height: 28px; margin: 0 10px; }
.footer { position: absolute; left: 56px; right: 56px; bottom: 40px; color: #777; font-size: 9.5px;
          border-top: 1px solid #ddd; padding-top: 8px; }
`;

/** Sole proprietors (ФОП) use the 10-digit personal tax number. */
function taxIdLabel(party: Party): string {
  return party.taxId.length === 10 ? "РНОКПП" : "Код ЄДРПОУ";
}

function partyBlock(label: string, party: Party, withBank: boolean): string {
  const rows = [
    `<dt>${label}</dt><dd class="name">${esc(party.name)}</dd>`,
    `<dt>${taxIdLabel(party)}</dt><dd>${party.taxId}</dd>`,
    ...party.address.map((line) => `<dt>Адреса</dt><dd>${esc(line)}</dd>`),
  ];
  if (withBank && party.iban) {
    rows.push(`<dt>IBAN</dt><dd>${ibanGroups(party.iban)}</dd>`);
    rows.push(`<dt>Банк</dt><dd>${esc(party.bank ?? "")}</dd>`);
  }
  rows.push(...(party.extra ?? []).map((extra) => `<dt></dt><dd>${esc(extra)}</dd>`));

  return `<dl class="party">${rows.join("")}</dl>`;
}

function lineRow(line: Line, index: number): string {
  return `<tr>
    <td class="c">${index + 1}</td><td>${esc(line.description)}</td>
    <td class="c">${esc(line.unit)}</td><td class="num">${decimal(line.quantity)}</td>
    <td class="num">${moneyUa(line.unitPrice)}</td><td class="num">${moneyUa(line.amount)}</td>
  </tr>`;
}

/** A Ukrainian "рахунок на оплату" in the usual layout. */
export function renderUa(inv: SampleInvoice): string {
  const withVat = inv.vatRate > 0;
  const vatLabel = withVat ? `ПДВ ${decimal(inv.vatRate)}%:` : "Без ПДВ";
  const vatValue = withVat ? moneyUa(inv.vatAmount) : "—";

  return `<!doctype html>
<html lang="uk"><head><meta charset="utf-8"><title>Рахунок № ${esc(inv.number)}</title>
<style>${CSS}</style></head>
<body style="--accent: ${inv.accent}"><div class="page">
  <div class="bar"></div>
  ${partyBlock("Постачальник", inv.supplier, true)}
  ${partyBlock("Покупець", inv.buyer, false)}

  <h1>Рахунок на оплату № ${esc(inv.number)} від ${esc(inv.printedDate)}</h1>
  <div class="subtitle">Оплатити до ${esc(inv.printedDueDate)}</div>

  <table>
    <thead><tr>
      <th style="width:34px">№</th><th>Найменування товару, роботи, послуги</th>
      <th style="width:52px">Од.</th><th style="width:62px">Кількість</th>
      <th style="width:96px">${withVat ? "Ціна без ПДВ" : "Ціна"}</th>
      <th style="width:104px">${withVat ? "Сума без ПДВ" : "Сума"}</th>
    </tr></thead>
    <tbody>${inv.lines.map(lineRow).join("")}</tbody>
  </table>

  <table class="totals">
    <tr><td>Разом без ПДВ:</td><td>${moneyUa(inv.netAmount)}</td></tr>
    <tr><td>${vatLabel}</td><td>${vatValue}</td></tr>
    <tr class="grand"><td>Всього до сплати, ${inv.currency}:</td><td>${moneyUa(inv.totalAmount)}</td></tr>
  </table>

  <div class="words">
    Всього найменувань ${inv.lines.length}, на суму ${moneyUa(inv.totalAmount)} грн.
    <b>${esc(inv.totalInWords ?? "")}</b>
  </div>
  ${inv.vatNote ? `<div class="note">${esc(inv.vatNote)}</div>` : ""}

  <div class="sign">
    <div>Виписав(ла):<span class="line"></span>${esc(inv.signatory ?? "")}</div>
    <div>М.П.</div>
  </div>
  <div class="footer">У призначенні платежу обов'язково вкажіть номер рахунку.</div>
</div></body></html>`;
}
