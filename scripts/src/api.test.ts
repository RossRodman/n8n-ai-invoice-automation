import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getNode, type Item, loadWorkflow, runCode, type Workflow } from "./workflow.ts";

const api = loadWorkflow("invoice-api.json") as Workflow & { id: string };
const errors = loadWorkflow("invoice-errors.json") as Workflow & { id: string };

/** Rows the way the Google Sheets node returns them. */
const LEDGER_ROW = {
  row_number: 2,
  received_at: "2026-11-03T08:00:00.000Z",
  supplier_name: "ТОВ «Будмакс»",
  supplier_tax_id: "41234567",
  invoice_number: "INV-2026-0142",
  invoice_date: "2026-11-03",
  due_date: "2026-11-17",
  currency: "UAH",
  net_amount: 10000,
  vat_rate: 20,
  vat_amount: 2000,
  total_amount: 12000,
  confidence: 0.96,
  file_name: "01-budmax-uah-vat-20.pdf",
  email_from: "accounts@budmax.ua",
  email_subject: "Рахунок",
  email_link: "https://mail.google.com/mail/u/0/#all/abc",
  gmail_message_id: "abc",
};

const REVIEW_ROW = {
  row_number: 2,
  review_reasons: "amounts_mismatch, low_confidence",
  review_details: "Amounts don't add up",
  received_at: "2026-11-06T08:00:00.000Z",
  supplier_name: "ТОВ «Офіс Плюс»",
  supplier_tax_id: "38765412",
  invoice_number: "ОП-5531",
  invoice_date: "2026-11-06",
  due_date: "2026-11-13",
  currency: "UAH",
  net_amount: 8450,
  vat_rate: 20,
  vat_amount: 1690,
  total_amount: 10240,
  confidence: 0.95,
  file_name: "04-ofis-plus-amounts-mismatch.pdf",
  email_from: "a@ofis.ua",
  email_subject: "Рахунок ОП-5531",
  email_link: "",
  gmail_message_id: "m4",
  status: "open",
  resolved_at: "",
  resolution_note: "",
};

const items = (rows: Record<string, unknown>[]): Item[] => rows.map((json) => ({ json }));
type Response = { json: { status: number; body: Record<string, unknown> } };
const first = (result: unknown) => {
  const response = (result as Response[])[0]?.json;
  if (!response) throw new Error("the node returned nothing");
  return response;
};

function targets(name: string): string[][] {
  return (api.connections[name]?.main ?? []).map((output) => output.map((t) => t.node));
}

describe("API workflow file", () => {
  const webhooks = api.nodes.filter((n) => n.type === "n8n-nodes-base.webhook");

  it("has one webhook per endpoint, all behind Header Auth", () => {
    expect(webhooks.map((n) => `${n.parameters.httpMethod} /${n.parameters.path}`).sort()).toEqual([
      "GET /invoices",
      "GET /review",
      "POST /review/approve",
      "POST /review/reject",
    ]);
    for (const node of webhooks) {
      expect(node.name).toBe(`${node.parameters.httpMethod} /${node.parameters.path}`);
      expect(node.parameters).toMatchObject({
        authentication: "headerAuth",
        responseMode: "responseNode",
      });
      expect(node).toHaveProperty("webhookId");
    }
  });

  it("ends every path of an endpoint in that endpoint's Respond node", () => {
    for (const [hook, responder] of [
      ["GET /invoices", "Respond: invoices"],
      ["GET /review", "Respond: review"],
      ["POST /review/approve", "Respond: approve"],
      ["POST /review/reject", "Respond: reject"],
    ] as const) {
      const ends = new Set<string>();
      const visit = (name: string, seen = new Set<string>()) => {
        if (seen.has(name)) return;
        seen.add(name);
        const next = targets(name).flat();
        if (next.length === 0) ends.add(name);
        for (const target of next) visit(target, seen);
      };
      visit(hook);
      expect([...ends]).toEqual([responder]);
      expect(getNode(api, responder).parameters).toMatchObject({
        respondWith: "json",
        responseBody: "={{ JSON.stringify($json.body) }}",
        options: { responseCode: "={{ $json.status }}" },
      });
    }
  });

  it("ships without credentials and reports failures to the error workflow", () => {
    for (const node of api.nodes) expect(node.credentials).toBeUndefined();
    expect(api.settings.errorWorkflow).toBe(errors.id);
  });

  const sheets = (operation?: string) =>
    api.nodes.filter(
      (n) => n.type === "n8n-nodes-base.googleSheets" && n.parameters.operation === operation,
    );

  it("writes to Sheets as RAW values and matches review rows by row number", () => {
    for (const node of [...sheets("append"), ...sheets("update")]) {
      expect(node.parameters.options).toEqual({ cellFormat: "RAW" });
    }
    for (const node of sheets("update")) {
      expect(node.parameters.columns).toMatchObject({ matchingColumns: ["row_number"] });
    }
  });

  it("carries on with an empty tab", () => {
    expect(sheets(undefined)).toHaveLength(5);
    for (const node of sheets(undefined)) expect(node).toMatchObject({ alwaysOutputData: true });
  });

  it("doesn't fail an approval because Slack is down", () => {
    expect(getNode(api, "Slack: post to #invoices")).toMatchObject({
      onError: "continueRegularOutput",
    });
  });
});

describe("GET /invoices", () => {
  const list = (rows: Record<string, unknown>[]) =>
    first(runCode(api, "Invoices response", { input: items(rows) }));

  it("returns the ledger, newest first, with row numbers as ids", () => {
    const older = { ...LEDGER_ROW, row_number: 3, received_at: "2026-11-01T08:00:00.000Z" };
    const result = list([older, LEDGER_ROW]);

    expect(result.status).toBe(200);
    const invoices = result.body.invoices as Record<string, unknown>[];
    expect(invoices.map((i) => i.id)).toEqual([2, 3]);
    const { row_number: _rowNumber, ...fields } = LEDGER_ROW;
    expect(invoices[0]).toEqual({ id: 2, ...fields });
  });

  it("cleans up what Sheets returns", () => {
    const [invoice] = list([
      {
        ...LEDGER_ROW,
        supplier_tax_id: 3104512876,
        invoice_number: 27,
        invoice_date: 46331,
        due_date: "",
        net_amount: "23 400,00",
        vat_amount: "0",
        total_amount: "n/a",
        email_link: "",
      },
    ]).body.invoices as Record<string, unknown>[];

    expect(invoice).toMatchObject({
      supplier_tax_id: "3104512876",
      invoice_number: "27",
      invoice_date: "2026-11-05",
      due_date: null,
      net_amount: 23400,
      vat_amount: 0,
      total_amount: null,
      email_link: null,
    });
  });

  it("returns an empty list for an empty sheet", () => {
    expect(list([{}])).toEqual({ status: 200, body: { invoices: [] } });
  });
});

describe("GET /review", () => {
  const list = (rows: Record<string, unknown>[], status?: string) =>
    first(
      runCode(api, "Review response", {
        input: items(rows),
        nodeItems: { "GET /review": [{ json: { query: status === undefined ? {} : { status } } }] },
      }),
    );
  const rows = [
    REVIEW_ROW,
    { ...REVIEW_ROW, row_number: 3, status: "approved", received_at: "2026-11-07T08:00:00.000Z" },
    { ...REVIEW_ROW, row_number: 4, status: "", received_at: "2026-11-08T08:00:00.000Z" },
    { ...REVIEW_ROW, row_number: 5, status: "Rejected" },
  ];
  const ids = (result: ReturnType<typeof list>) =>
    (result.body.items as { id: number }[]).map((item) => item.id);

  it("returns the open items by default, newest first; a blank status counts as open", () => {
    expect(ids(list(rows))).toEqual([4, 2]);
  });

  it("filters by status, or returns everything", () => {
    expect(ids(list(rows, "approved"))).toEqual([3]);
    expect(ids(list(rows, "rejected"))).toEqual([5]);
    expect(ids(list(rows, "all"))).toEqual([4, 3, 2, 5]);
  });

  it("splits the reasons and keeps the review fields", () => {
    const [item] = list([REVIEW_ROW]).body.items as Record<string, unknown>[];
    expect(item).toMatchObject({
      id: 2,
      review_reasons: ["amounts_mismatch", "low_confidence"],
      review_details: "Amounts don't add up",
      status: "open",
      resolved_at: null,
      resolution_note: null,
      total_amount: 10240,
    });
  });

  it("rejects an unknown status", () => {
    expect(list(rows, "done")).toEqual({
      status: 400,
      body: { message: "status must be one of: open, approved, rejected, all" },
    });
  });
});

describe("POST /review/approve", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-10T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  const approve = (
    body: Record<string, unknown>,
    review: Record<string, unknown>[] = [REVIEW_ROW],
    ledger: Record<string, unknown>[] = [LEDGER_ROW],
  ) =>
    (
      runCode(api, "Prepare approval", {
        input: items(ledger),
        nodeItems: {
          "POST /review/approve": [{ json: { body } }],
          "Sheets: read Review (approve)": items(review),
        },
      }) as { json: Record<string, unknown> }[]
    )[0]?.json;

  it("refuses an invoice whose amounts still don't add up", () => {
    expect(approve({ id: 2 })).toEqual({
      status: 422,
      body: {
        message: "The invoice can't go into the books yet",
        problems: ["Net + VAT is 10 140,00, the total is 10 240,00"],
      },
    });
  });

  it("approves it once a person fixes the total", () => {
    const result = approve({ id: 2, fields: { total_amount: "10 140,00" }, note: " Called them " });

    const {
      row_number: _rowNumber,
      status: _s,
      resolved_at: _r,
      resolution_note: _n,
      review_reasons: _rr,
      review_details: _rd,
      ...fields
    } = REVIEW_ROW;
    const invoice = {
      ...fields,
      total_amount: 10140,
      email_link: "https://mail.google.com/mail/u/0/#all/m4",
    };
    expect(result).toEqual({
      ok: true,
      invoice: { id: 2, ...invoice },
      ledger_row: invoice,
      review_update: {
        row_number: 2,
        status: "approved",
        resolved_at: "2026-11-10T12:00:00.000Z",
        resolution_note: "Called them",
      },
    });
    expect(Object.keys(result?.ledger_row as object)).toEqual(Object.keys(fields));
  });

  it("checks every field a person fills in for a scan", () => {
    const scan = {
      ...REVIEW_ROW,
      ...Object.fromEntries(
        [
          "supplier_name",
          "supplier_tax_id",
          "invoice_number",
          "invoice_date",
          "due_date",
          "currency",
          "net_amount",
          "vat_rate",
          "vat_amount",
          "total_amount",
          "confidence",
        ].map((f) => [f, ""]),
      ),
    };
    expect(approve({ id: 2 }, [scan])?.body).toMatchObject({
      problems: [
        "Missing: supplier, invoice number, invoice date, currency, net amount, VAT amount, total",
      ],
    });

    const result = approve(
      {
        id: 2,
        fields: {
          supplier_name: "ТОВ «ТехноСервіс Груп»",
          supplier_tax_id: "4091 7355",
          invoice_number: "ТС-0918",
          invoice_date: "2026-11-07",
          currency: "uah",
          net_amount: 7500,
          vat_rate: 20,
          vat_amount: 1500,
          total_amount: 9000,
        },
      },
      [scan],
    );
    expect(result?.ok).toBe(true);
    expect(result?.invoice).toMatchObject({
      supplier_tax_id: "40917355",
      currency: "UAH",
      confidence: null,
    });
  });

  it("explains bad corrections", () => {
    const result = approve({
      id: 2,
      fields: {
        total_amount: 10140,
        invoice_date: "06.11.2026",
        currency: "грн",
        vat_amount: 1600,
      },
    });
    expect(result?.body).toMatchObject({
      problems: [
        "invoice_date must be a date like 2026-11-03",
        "currency must be a three-letter code like UAH or EUR",
        "Net + VAT is 10 050,00, the total is 10 140,00",
        "20% VAT on 8 450,00 is 1 690,00, not 1 600,00",
      ],
    });
  });

  it("won't put the same invoice in the books twice", () => {
    const duplicate = { ...REVIEW_ROW, ...LEDGER_ROW, row_number: 2, status: "open" };
    expect(approve({ id: 2 }, [duplicate])?.body).toMatchObject({
      problems: ["Invoice INV-2026-0142 from ТОВ «Будмакс» is already in the books"],
    });
  });

  it("only approves open items that exist", () => {
    expect(approve({})).toEqual({
      status: 400,
      body: { message: "id must be the review row number" },
    });
    expect(approve({ id: "two" })?.status).toBe(400);
    expect(approve({ id: 9 })).toEqual({ status: 404, body: { message: "No review item 9" } });
    expect(approve({ id: 2 }, [{ ...REVIEW_ROW, status: "rejected" }])).toEqual({
      status: 409,
      body: { message: "Review item 2 is already rejected" },
    });
  });

  it("ignores fields a person isn't meant to change", () => {
    const result = approve({
      id: 2,
      fields: { total_amount: 10140, confidence: 1, file_name: "x" },
    });
    expect(result?.invoice).toMatchObject({ confidence: 0.95, file_name: REVIEW_ROW.file_name });
  });

  it("files, marks, announces and answers, in that order", () => {
    expect(targets("Can approve?")).toEqual([["Approval: ledger row"], ["Respond: approve"]]);
    const chain: string[] = [];
    for (
      let next: string | undefined = "Approval: ledger row";
      next;
      next = targets(next)[0]?.[0]
    ) {
      chain.push(next);
    }
    expect(chain).toEqual([
      "Approval: ledger row",
      "Sheets: add to Invoices",
      "Approval: review update",
      "Sheets: mark approved",
      "Format approval message",
      "Slack: post to #invoices",
      "Approval response",
      "Respond: approve",
    ]);
  });

  it("hands the right data to each step", () => {
    const prepared = approve({ id: 2, fields: { total_amount: 10140 }, note: "ok" }) as Record<
      string,
      unknown
    >;
    const nodes = { "Prepare approval": prepared };

    expect(runCode(api, "Approval: ledger row", { json: prepared })).toEqual({
      json: prepared.ledger_row,
    });
    expect(runCode(api, "Approval: review update", { nodes })).toEqual({
      json: prepared.review_update,
    });
    expect(runCode(api, "Approval response", { nodes })).toEqual({
      json: { status: 200, body: { invoice: prepared.invoice } },
    });
    expect(
      (runCode(api, "Format approval message", { nodes }) as { json: { text: string } }).json.text,
    ).toBe(
      [
        ":white_check_mark: *Approved after review: ТОВ «Офіс Плюс»*",
        "*10 140,00 UAH* · No. ОП-5531 · dated 2026-11-06",
        "> ok",
      ].join("\n"),
    );
  });
});

describe("POST /review/reject", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-10T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  const reject = (
    body: Record<string, unknown>,
    review: Record<string, unknown>[] = [REVIEW_ROW],
  ) =>
    (
      runCode(api, "Prepare rejection", {
        input: items(review),
        nodeItems: { "POST /review/reject": [{ json: { body } }] },
      }) as { json: Record<string, unknown> }[]
    )[0]?.json;

  it("marks an open item rejected, with the note", () => {
    const prepared = reject({ id: 2, note: "A quote, not an invoice" });
    expect(prepared).toEqual({
      ok: true,
      review_update: {
        row_number: 2,
        status: "rejected",
        resolved_at: "2026-11-10T12:00:00.000Z",
        resolution_note: "A quote, not an invoice",
      },
    });

    expect(runCode(api, "Rejection: review update", { json: prepared })).toEqual({
      json: prepared?.review_update,
    });
    expect(
      runCode(api, "Rejection response", { nodes: { "Prepare rejection": prepared ?? {} } }),
    ).toEqual({
      json: {
        status: 200,
        body: { id: 2, status: "rejected", resolved_at: "2026-11-10T12:00:00.000Z" },
      },
    });
  });

  it("only rejects open items that exist", () => {
    expect(reject({})?.status).toBe(400);
    expect(reject({ id: 7 })?.status).toBe(404);
    expect(reject({ id: 2 }, [{ ...REVIEW_ROW, status: "approved" }])?.status).toBe(409);
  });

  it("marks the row, then answers", () => {
    expect(targets("Can reject?")).toEqual([["Rejection: review update"], ["Respond: reject"]]);
    expect(targets("Rejection: review update")).toEqual([["Sheets: mark rejected"]]);
    expect(targets("Sheets: mark rejected")).toEqual([["Rejection response"]]);
    expect(targets("Rejection response")).toEqual([["Respond: reject"]]);
  });
});
