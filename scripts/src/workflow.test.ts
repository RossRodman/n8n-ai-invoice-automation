import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ExpectedFile } from "./expected.ts";
import { EXPECTED_FILE } from "./paths.ts";
import { getNode, type Item, loadWorkflow, runCode, type Workflow } from "./workflow.ts";

const main = loadWorkflow("invoice-processing.json");
const errors = loadWorkflow("invoice-errors.json");
const expected = JSON.parse(readFileSync(EXPECTED_FILE, "utf8")) as ExpectedFile;
const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");

const SOURCE = {
  gmail_message_id: "19a3f0c2d4e5b6a7",
  email_from: "accounts@budmax.ua",
  email_subject: "Рахунки за листопад",
  received_at: "2026-11-10T09:15:00.000Z",
  file_name: "01-budmax-uah-vat-20.pdf",
};
const EMAIL_LINK = `https://mail.google.com/mail/u/0/#all/${SOURCE.gmail_message_id}`;

const LEDGER_COLUMNS = [
  "received_at",
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
  "file_name",
  "email_from",
  "email_subject",
  "email_link",
  "gmail_message_id",
];

/** A parsed invoice that passes every check: sample #1. */
const GOOD = {
  received_at: SOURCE.received_at,
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
  confidence: 0.95,
  file_name: SOURCE.file_name,
  email_from: SOURCE.email_from,
  email_subject: SOURCE.email_subject,
  email_link: EMAIL_LINK,
  gmail_message_id: SOURCE.gmail_message_id,
};

const json = (result: unknown) => (result as { json: Record<string, unknown> }).json;

/** Where each output of a node goes: [["Next"], ["On false / on error"]]. */
function targets(workflow: Workflow, name: string): string[][] {
  return (workflow.connections[name]?.main ?? []).map((output) => output.map((t) => t.node));
}

describe("main workflow file", () => {
  it("has unique node names and ids", () => {
    const names = main.nodes.map((n) => n.name);
    const ids = main.nodes.map((n) => n.id);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only connects nodes that exist", () => {
    for (const workflow of [main, errors]) {
      const names = new Set(workflow.nodes.map((n) => n.name));
      for (const [from, { main: outputs }] of Object.entries(workflow.connections)) {
        expect(names).toContain(from);
        for (const target of outputs.flat()) expect(names).toContain(target.node);
      }
    }
  });

  it("reaches every node from the Gmail trigger", () => {
    const reached = new Set<string>();
    const visit = (name: string) => {
      if (reached.has(name)) return;
      reached.add(name);
      for (const next of targets(main, name).flat()) visit(next);
    };
    visit("Gmail: new invoice email");

    const nodes = main.nodes.filter((n) => n.type !== "n8n-nodes-base.stickyNote");
    expect([...reached].sort()).toEqual(nodes.map((n) => n.name).sort());
  });

  it("ships without credentials", () => {
    for (const node of [...main.nodes, ...errors.nodes]) expect(node.credentials).toBeUndefined();
  });

  it("only reads settings that .env.example documents", () => {
    const env = readFileSync(new URL("../../.env.example", import.meta.url), "utf8");
    const used = new Set(JSON.stringify([main, errors]).match(/\$env\.[A-Z_]+/g));
    expect(used.size).toBeGreaterThan(0);
    for (const ref of used) expect(env).toContain(`${ref.slice("$env.".length)}=`);
  });

  it("hands its failures to the error workflow", () => {
    expect(main.settings.errorWorkflow).toBe((errors as Workflow & { id: string }).id);
  });
});

describe("routing", () => {
  it("sends PDFs without text, and PDFs that can't be read, to review", () => {
    expect(targets(main, "Extract PDF text")).toEqual([["Has text?"], ["Flag unreadable PDF"]]);
    expect(targets(main, "Has text?")).toEqual([
      ["Build extraction request"],
      ["Flag unreadable PDF"],
    ]);
  });

  it("retries a failed OpenAI call once after a pause, then gives up to review", () => {
    expect(targets(main, "OpenAI: extract fields")).toEqual([["Merge answers"], ["Wait 20 s"]]);
    expect(targets(main, "Wait 20 s")).toEqual([["OpenAI: retry"]]);
    expect(main.connections["OpenAI: retry"]?.main).toEqual([
      [{ node: "Merge answers", type: "main", index: 1 }],
      [{ node: "Flag unreadable PDF", type: "main", index: 0 }],
    ]);
    expect(getNode(main, "Wait 20 s").parameters).toMatchObject({ amount: 20, unit: "seconds" });
  });

  it("sends an answer that can't be parsed to review", () => {
    expect(targets(main, "Parse invoice")).toEqual([
      ["Sheets: read Invoices"],
      ["Flag unreadable PDF"],
    ]);
  });

  it("splits checked invoices into the ledger and the review queue", () => {
    expect(targets(main, "Checks pass?")).toEqual([["Ledger row"], ["Review row"]]);
    expect(targets(main, "Flag unreadable PDF")).toEqual([["Review row"]]);
  });

  it("files, announces and labels each branch", () => {
    const chain = (start: string) => {
      const names = [start];
      for (let next = targets(main, start)[0]?.[0]; next; next = targets(main, next)[0]?.[0]) {
        names.push(next);
      }
      return names;
    };
    expect(chain("Ledger row")).toEqual([
      "Ledger row",
      "Sheets: add to Invoices",
      "Format Slack message",
      "Slack: post to #invoices",
      "Gmail: label processed",
    ]);
    expect(chain("Review row")).toEqual([
      "Review row",
      "Sheets: add to Review",
      "Format review alert",
      "Slack: post to #invoices-review",
      "Gmail: label review",
    ]);
  });

  it("keeps the batch going when one invoice fails", () => {
    for (const name of [
      "Extract PDF text",
      "OpenAI: extract fields",
      "OpenAI: retry",
      "Parse invoice",
    ]) {
      expect(getNode(main, name)).toMatchObject({ onError: "continueErrorOutput" });
    }
  });
});

describe("Split PDF attachments", () => {
  const email = (binary: Item["binary"], extra: Record<string, unknown> = {}): Item => ({
    json: {
      id: "19a3f0c2d4e5b6a7",
      from: { value: [{ address: "accounts@budmax.ua", name: "Будмакс" }], text: "Будмакс" },
      subject: "Рахунки за листопад",
      date: "2026-11-10T09:15:00.000Z",
      ...extra,
    },
    binary,
  });
  const pdf = (fileName: string) => ({ fileName, mimeType: "application/pdf" });
  const split = (input: Item[]) => runCode(main, "Split PDF attachments", { input }) as Item[];

  it("makes one item per PDF, with where it came from", () => {
    const items = split([email({ attachment_0: pdf("a.pdf"), attachment_1: pdf("b.pdf") })]);

    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      json: { ...SOURCE, file_name: "a.pdf" },
      binary: { data: pdf("a.pdf") },
      pairedItem: { item: 0 },
    });
    expect(items[1]?.json.file_name).toBe("b.pdf");
  });

  it("skips attachments that aren't PDFs", () => {
    const items = split([
      email({
        attachment_0: { fileName: "logo.png", mimeType: "image/png" },
        attachment_1: pdf("invoice.pdf"),
        attachment_2: { fileName: "prices.xlsx", mimeType: "application/vnd.ms-excel" },
      }),
    ]);
    expect(items.map((i) => i.json.file_name)).toEqual(["invoice.pdf"]);
  });

  it("recognises a PDF by its name when the mime type is generic", () => {
    const items = split([
      email({ attachment_0: { fileName: "SCAN_0001.PDF", mimeType: "application/octet-stream" } }),
    ]);
    expect(items).toHaveLength(1);
  });

  it("handles several emails and keeps track of which one each PDF is from", () => {
    const items = split([
      email({ attachment_0: pdf("a.pdf") }),
      email({}, { id: "second" }),
      email({ attachment_0: pdf("c.pdf") }, { id: "third" }),
    ]);
    expect(items.map((i) => [i.json.gmail_message_id, i.pairedItem])).toEqual([
      ["19a3f0c2d4e5b6a7", { item: 0 }],
      ["third", { item: 2 }],
    ]);
  });

  it("copes with a sender that has no parsed address", () => {
    const items = split([email({ attachment_0: pdf("a.pdf") }, { from: { text: "billing" } })]);
    expect(items[0]?.json.email_from).toBe("billing");
  });
});

describe("Has text?", () => {
  it("needs at least 20 characters that aren't whitespace", () => {
    const condition = (
      getNode(main, "Has text?").parameters as {
        conditions: { conditions: { leftValue: string; rightValue: number; operator: unknown }[] };
      }
    ).conditions.conditions[0];

    expect(condition).toMatchObject({
      leftValue: "={{ String($json.text ?? '').replace(/\\s/g, '').length }}",
      rightValue: 20,
      operator: { type: "number", operation: "gte" },
    });
  });
});

describe("Build extraction request", () => {
  type Request = {
    model: string;
    messages: { role: string; content: string }[];
    response_format: {
      type: string;
      json_schema: {
        strict: boolean;
        schema: {
          required: string[];
          properties: Record<string, unknown>;
          additionalProperties: boolean;
        };
      };
    };
  };
  const build = (text: unknown, env: Record<string, string> = {}) =>
    json(
      runCode(main, "Build extraction request", {
        json: { text },
        nodes: { "Split PDF attachments": SOURCE },
        env,
      }),
    ).request as Request;

  it("asks for exactly the fields expected.json lists, plus confidence", () => {
    const { schema } = build("text").response_format.json_schema;
    const fields = Object.keys(expected.invoices[0]?.fields ?? {});

    expect(Object.keys(schema.properties).sort()).toEqual([...fields, "confidence"].sort());
  });

  it("uses a strict schema, which needs every field required and nothing extra", () => {
    const { json_schema: jsonSchema, type } = build("text").response_format;

    expect(type).toBe("json_schema");
    expect(jsonSchema.strict).toBe(true);
    expect(jsonSchema.schema.additionalProperties).toBe(false);
    expect(jsonSchema.schema.required.sort()).toEqual(
      Object.keys(jsonSchema.schema.properties).sort(),
    );
  });

  it("sends the file name and the PDF text", () => {
    const [system, user] = build("  Рахунок на оплату № 1  ").messages;

    expect(system?.role).toBe("system");
    expect(user).toEqual({
      role: "user",
      content: "File: 01-budmax-uah-vat-20.pdf\n\nРахунок на оплату № 1",
    });
  });

  it("caps very long text", () => {
    const content = build("x".repeat(100_000)).messages[1]?.content ?? "";
    expect(content.length).toBeLessThan(31_000);
  });

  it("uses INVOICE_OPENAI_MODEL, with a default", () => {
    expect(build("text").model).toBe("gpt-5-mini");
    expect(build("text", { INVOICE_OPENAI_MODEL: "gpt-5" }).model).toBe("gpt-5");
  });

  it("is sent by both OpenAI calls, the first try and the retry", () => {
    for (const name of ["OpenAI: extract fields", "OpenAI: retry"]) {
      expect(getNode(main, name).parameters).toMatchObject({
        method: "POST",
        url: "https://api.openai.com/v1/chat/completions",
        authentication: "predefinedCredentialType",
        nodeCredentialType: "openAiApi",
        jsonBody: "={{ JSON.stringify($('Build extraction request').item.json.request) }}",
      });
    }
  });
});

describe("Parse invoice", () => {
  const answer = (content: unknown) => ({
    choices: [{ message: { role: "assistant", content: JSON.stringify(content) } }],
  });
  const parse = (input: Record<string, unknown>, source = SOURCE) =>
    json(
      runCode(main, "Parse invoice", { json: input, nodes: { "Split PDF attachments": source } }),
    );

  it.each(expected.invoices)("turns the answer for $file into a row", (invoice) => {
    const source = { ...SOURCE, file_name: invoice.file };
    const row = parse(answer({ ...invoice.fields, confidence: 0.93 }), source);

    expect(row).toEqual({
      received_at: SOURCE.received_at,
      ...invoice.fields,
      confidence: 0.93,
      file_name: invoice.file,
      email_from: SOURCE.email_from,
      email_subject: SOURCE.email_subject,
      email_link: EMAIL_LINK,
      gmail_message_id: SOURCE.gmail_message_id,
    });
  });

  it("cleans up what the model returns", () => {
    const row = parse(
      answer({
        supplier_name: "  ТОВ «Будмакс» ",
        supplier_tax_id: "4123 4567",
        invoice_number: "",
        invoice_date: "2026-02-30",
        due_date: "17.11.2026",
        currency: "uah",
        net_amount: 10000.004,
        vat_rate: 20,
        vat_amount: Number.NaN,
        total_amount: "12000",
        confidence: 1.4,
      }),
    );

    expect(row).toMatchObject({
      supplier_name: "ТОВ «Будмакс»",
      supplier_tax_id: "41234567",
      invoice_number: null,
      invoice_date: null,
      due_date: null,
      currency: "UAH",
      net_amount: 10000,
      vat_amount: null,
      total_amount: null,
      confidence: 1,
    });
  });

  it("fails loudly when OpenAI refuses or says nothing", () => {
    expect(() => parse({ choices: [{ message: { refusal: "I can't help with that." } }] })).toThrow(
      "OpenAI refused to read 01-budmax-uah-vat-20.pdf: I can't help with that.",
    );
    expect(() => parse({ choices: [] })).toThrow("OpenAI returned no answer");
  });
});

describe("Check invoice", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-10T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  type Checked = typeof GOOD & { review_reasons: string[]; review_details: string };
  const check = (
    invoices: Record<string, unknown>[],
    ledger: Record<string, unknown>[] = [{}],
    env: Record<string, string> = {},
  ) =>
    (
      runCode(main, "Check invoice", {
        input: ledger.map((row) => ({ json: row })),
        nodeItems: { "Parse invoice": invoices.map((invoice) => ({ json: invoice })) },
        env,
      }) as { json: Checked }[]
    ).map((item) => item.json);
  const one = (changes: Record<string, unknown>, env?: Record<string, string>) =>
    check([{ ...GOOD, ...changes }], [{}], env)[0] as Checked;

  it("passes a good invoice through untouched", () => {
    expect(one({})).toEqual({ ...GOOD, review_reasons: [], review_details: "" });
  });

  it.each(expected.invoices.filter((invoice) => invoice.has_text_layer))(
    "routes $file the way expected.json says",
    (invoice) => {
      const result = one({ ...invoice.fields, confidence: 0.95 });
      expect(result.review_reasons).toEqual(invoice.review_reasons);
    },
  );

  it("lists missing required fields", () => {
    const result = one({ supplier_name: null, invoice_number: null, currency: null });
    expect(result.review_reasons).toEqual(["missing_fields"]);
    expect(result.review_details).toBe("Missing: supplier, invoice number, currency");
  });

  it("explains amounts that don't add up", () => {
    expect(one({ total_amount: 12100 }).review_details).toBe(
      "Amounts don't add up: net + VAT is 12 000,00, the total says 12 100,00",
    );
    expect(one({ vat_amount: 1900, total_amount: 11900 }).review_details).toBe(
      "Amounts don't add up: 20% VAT on 10 000,00 is 2 000,00, the invoice says 1 900,00",
    );
  });

  it("allows two cents of rounding", () => {
    expect(one({ total_amount: 12000.02 }).review_reasons).toEqual([]);
    expect(one({ total_amount: 12000.03 }).review_reasons).toEqual(["amounts_mismatch"]);
  });

  it("doesn't check the VAT rate when the invoice doesn't give one", () => {
    expect(one({ vat_rate: null }).review_reasons).toEqual([]);
  });

  it("flags impossible dates", () => {
    expect(one({ invoice_date: "2026-11-11" }).review_details).toBe(
      "Dates: invoice date 2026-11-11 is in the future",
    );
    expect(one({ due_date: "2026-11-01" }).review_details).toBe(
      "Dates: due date 2026-11-01 is before the invoice date",
    );
    expect(one({ invoice_date: "2026-11-10", due_date: null }).review_reasons).toEqual([]);
  });

  it("judges 'today' in the configured time zone", () => {
    // 23:30 UTC on 10 Nov is already 11 Nov in Kyiv.
    vi.setSystemTime(new Date("2026-11-10T23:30:00Z"));
    expect(one({ invoice_date: "2026-11-11", due_date: null }).review_reasons).toEqual([]);
    expect(
      one({ invoice_date: "2026-11-11", due_date: null }, { GENERIC_TIMEZONE: "UTC" })
        .review_reasons,
    ).toEqual(["invalid_date"]);
  });

  it("flags low confidence against INVOICE_MIN_CONFIDENCE", () => {
    expect(one({ confidence: 0.62 }).review_details).toBe("AI confidence 62%, below 80%");
    expect(one({ confidence: 0.62 }, { INVOICE_MIN_CONFIDENCE: "0.6" }).review_reasons).toEqual([]);
    expect(one({ confidence: null }).review_details).toBe("AI confidence unknown, below 80%");
    expect(one({ confidence: 0.79 }, { INVOICE_MIN_CONFIDENCE: "oops" }).review_reasons).toEqual([
      "low_confidence",
    ]);
  });

  it("spots an invoice that is already in the ledger, as Sheets returns it", () => {
    const ledger = [
      { row_number: 2, supplier_tax_id: 41234567, invoice_number: " inv-2026-0142 " },
    ];
    const [result] = check([GOOD], ledger);
    expect(result?.review_reasons).toEqual(["duplicate"]);
    expect(result?.review_details).toBe("Already in the books: INV-2026-0142 from ТОВ «Будмакс»");
  });

  it("matches on the supplier name when there is no tax id", () => {
    const ledger = [
      { supplier_tax_id: "", supplier_name: "ТОВ «Будмакс»", invoice_number: "INV-2026-0142" },
    ];
    const [result] = check([{ ...GOOD, supplier_tax_id: null }], ledger);
    expect(result?.review_reasons).toEqual(["duplicate"]);
  });

  it("lets the first of two copies in one batch through", () => {
    const results = check([GOOD, { ...GOOD, file_name: "copy.pdf" }]);
    expect(results.map((r) => r.review_reasons)).toEqual([[], ["duplicate"]]);
  });

  it("doesn't call different invoices from one supplier duplicates", () => {
    const results = check([GOOD, { ...GOOD, invoice_number: "INV-2026-0143" }]);
    expect(results.map((r) => r.review_reasons)).toEqual([[], []]);
  });

  it("collects every reason", () => {
    const result = one({ supplier_name: null, total_amount: 12100, confidence: 0.4 });
    expect(result.review_reasons).toEqual(["missing_fields", "amounts_mismatch", "low_confidence"]);
    expect(result.review_details.split(". ")).toHaveLength(3);
  });
});

describe("Flag unreadable PDF", () => {
  const flag = (input: Record<string, unknown>) =>
    json(
      runCode(main, "Flag unreadable PDF", {
        json: input,
        nodes: { "Split PDF attachments": SOURCE },
      }),
    );

  it("sends a PDF without text to review, with every field empty", () => {
    const row = flag({ text: "" });
    expect(row).toEqual({
      ...Object.fromEntries(LEDGER_COLUMNS.map((column) => [column, null])),
      received_at: SOURCE.received_at,
      file_name: SOURCE.file_name,
      email_from: SOURCE.email_from,
      email_subject: SOURCE.email_subject,
      email_link: EMAIL_LINK,
      gmail_message_id: SOURCE.gmail_message_id,
      review_reasons: ["no_text_layer"],
      review_details: "The PDF has no text layer, probably a scan. Enter it by hand.",
    });
  });

  it("explains a failed extraction in plain words", () => {
    expect(flag({ error: "Invalid PDF structure." }).review_details).toBe(
      "Couldn't read the invoice: Invalid PDF structure.",
    );
    expect(
      flag({
        error: String.raw`429 - "{\"error\":{\"message\":\"Rate limit reached for gpt-5-mini\"}}"`,
      }),
    ).toMatchObject({
      review_reasons: ["extraction_failed"],
      review_details: "Couldn't read the invoice: HTTP 429: Rate limit reached for gpt-5-mini",
    });
    expect(flag({ error: { message: "Timeout" } }).review_details).toBe(
      "Couldn't read the invoice: Timeout",
    );
  });
});

describe("Ledger row and Review row", () => {
  it("writes exactly the Invoices columns, in the README's order", () => {
    const row = json(
      runCode(main, "Ledger row", { json: { ...GOOD, review_reasons: [], extra: 1 } }),
    );
    expect(Object.keys(row)).toEqual(LEDGER_COLUMNS);
    expect(readme).toContain(LEDGER_COLUMNS.join("\t"));
  });

  it("puts the reasons first in the Review tab, then the same columns", () => {
    const row = json(
      runCode(main, "Review row", {
        json: {
          ...GOOD,
          review_reasons: ["amounts_mismatch", "low_confidence"],
          review_details: "Why",
        },
      }),
    );
    const columns = ["review_reasons", "review_details", ...LEDGER_COLUMNS];
    expect(Object.keys(row)).toEqual(columns);
    expect(row).toMatchObject({
      review_reasons: "amounts_mismatch, low_confidence",
      review_details: "Why",
    });
    expect(readme).toContain(columns.join("\t"));
  });

  it("fills missing values with null", () => {
    const row = json(runCode(main, "Ledger row", { json: { file_name: "a.pdf" } }));
    expect(row.supplier_name).toBeNull();
    expect(row.file_name).toBe("a.pdf");
  });
});

describe("Format Slack message", () => {
  const row = {
    supplier_name: "ТОВ «Будмакс»",
    invoice_number: "INV-2026-0142",
    invoice_date: "2026-11-03",
    due_date: "2026-11-17",
    currency: "UAH",
    vat_rate: 20,
    vat_amount: 2000,
    total_amount: 12000,
    file_name: "01-budmax-uah-vat-20.pdf",
    email_link: EMAIL_LINK,
  };
  const format = (invoice: Record<string, unknown>) =>
    json(runCode(main, "Format Slack message", { nodes: { "Ledger row": invoice } }))
      .text as string;

  it("summarises the invoice", () => {
    expect(format(row)).toBe(
      [
        ":receipt: *New invoice from ТОВ «Будмакс»*",
        "*12 000,00 UAH* · No. INV-2026-0142 · dated 2026-11-03 · due 2026-11-17",
        "VAT 20%: 2 000,00 UAH · 01-budmax-uah-vat-20.pdf",
        `<${EMAIL_LINK}|Open the email>`,
      ].join("\n"),
    );
  });

  it("says when there is no VAT", () => {
    expect(format({ ...row, vat_rate: 0, vat_amount: 0 })).toContain("\nNo VAT · ");
  });

  it("shows missing values as a dash", () => {
    const text = format({ ...row, due_date: null, total_amount: null });
    expect(text).toContain("*— UAH*");
    expect(text).toContain("due —");
  });

  it("escapes Slack markup in supplier text", () => {
    expect(format({ ...row, supplier_name: "A&B <Trade>" })).toContain("A&amp;B &lt;Trade&gt;");
  });
});

describe("Format review alert", () => {
  const review = {
    review_reasons: "amounts_mismatch",
    review_details: "Amounts don't add up: net + VAT is 10 140,00, the total says 10 240,00",
    supplier_name: "ТОВ «Офіс Плюс»",
    file_name: "04-ofis-plus-amounts-mismatch.pdf",
    email_subject: "Рахунок ОП-5531",
    email_link: EMAIL_LINK,
  };
  const format = (row: Record<string, unknown>, env: Record<string, string> = {}) =>
    json(runCode(main, "Format review alert", { nodes: { "Review row": row }, env }))
      .text as string;

  it("says why the invoice needs a person, with links", () => {
    expect(format(review, { INVOICE_SHEET_ID: "1AbC" })).toBe(
      [
        ":warning: *Invoice needs a review from ТОВ «Офіс Плюс»*",
        "04-ofis-plus-amounts-mismatch.pdf · Рахунок ОП-5531",
        "> Amounts don't add up: net + VAT is 10 140,00, the total says 10 240,00",
        `<${EMAIL_LINK}|Open the email> · <https://docs.google.com/spreadsheets/d/1AbC|Open the Review tab>`,
      ].join("\n"),
    );
  });

  it("works for a scan with no supplier, and without a sheet id", () => {
    const text = format({ ...review, supplier_name: null });
    expect(text.split("\n")[0]).toBe(":warning: *Invoice needs a review*");
    expect(text).not.toContain("Open the Review tab");
  });
});

describe("error workflow", () => {
  const format = (input: Record<string, unknown>) =>
    json(runCode(errors, "Format error alert", { json: input })).text as string;

  it("starts from n8n's error trigger and posts to the review channel", () => {
    expect(targets(errors, "When invoice processing fails")).toEqual([["Format error alert"]]);
    expect(targets(errors, "Format error alert")).toEqual([["Slack: post to #invoices-review"]]);
    expect(getNode(errors, "When invoice processing fails").type).toBe(
      "n8n-nodes-base.errorTrigger",
    );
    expect(getNode(errors, "Slack: post to #invoices-review").parameters).toMatchObject({
      channelId: { mode: "name", value: "={{ $env.INVOICE_SLACK_REVIEW_CHANNEL }}" },
    });
  });

  it("says what failed, where, and links to the execution", () => {
    expect(
      format({
        execution: {
          id: "231",
          url: "http://localhost:5678/workflow/InvoiceMainFlow1/executions/231",
          lastNodeExecuted: "Sheets: add to Invoices",
          error: { message: "The caller does not have permission" },
        },
        workflow: { id: "InvoiceMainFlow1", name: "Invoice processing" },
      }),
    ).toBe(
      [
        ":rotating_light: *Invoice processing failed*",
        "Step: Sheets: add to Invoices",
        "> The caller does not have permission",
        "<http://localhost:5678/workflow/InvoiceMainFlow1/executions/231|Open the execution>, fix the cause, then retry it from n8n.",
      ].join("\n"),
    );
  });

  it("copes with a bare error", () => {
    const text = format({});
    expect(text).toContain("*Invoice processing failed*");
    expect(text).toContain("Open n8n → Executions");
  });
});

describe("nodes that talk to other services", () => {
  it("reads Gmail with the configured query and downloads attachments", () => {
    expect(getNode(main, "Gmail: new invoice email").parameters).toMatchObject({
      simple: false,
      filters: { q: "={{ $env.INVOICE_GMAIL_QUERY }}" },
      options: { downloadAttachments: true },
    });
  });

  it("reads the ledger once per run, even when it's empty", () => {
    expect(getNode(main, "Sheets: read Invoices")).toMatchObject({
      executeOnce: true,
      alwaysOutputData: true,
      parameters: { sheetName: { mode: "name", value: "Invoices" } },
    });
  });

  it("appends to the right tabs of the configured sheet", () => {
    for (const [node, tab] of [
      ["Sheets: add to Invoices", "Invoices"],
      ["Sheets: add to Review", "Review"],
    ] as const) {
      expect(getNode(main, node).parameters).toMatchObject({
        operation: "append",
        documentId: { value: "={{ $env.INVOICE_SHEET_ID }}" },
        sheetName: { mode: "name", value: tab },
      });
    }
  });

  it("posts to the configured Slack channels", () => {
    expect(getNode(main, "Slack: post to #invoices").parameters).toMatchObject({
      channelId: { value: "={{ $env.INVOICE_SLACK_CHANNEL }}" },
      text: "={{ $json.text }}",
    });
    expect(getNode(main, "Slack: post to #invoices-review").parameters).toMatchObject({
      channelId: { value: "={{ $env.INVOICE_SLACK_REVIEW_CHANNEL }}" },
      text: "={{ $json.text }}",
    });
  });

  it("labels the email the invoice came from", () => {
    expect(getNode(main, "Gmail: label processed").parameters).toMatchObject({
      operation: "addLabels",
      messageId: "={{ $('Ledger row').item.json.gmail_message_id }}",
    });
    expect(getNode(main, "Gmail: label review").parameters).toMatchObject({
      operation: "addLabels",
      messageId: "={{ $('Review row').item.json.gmail_message_id }}",
    });
  });
});
