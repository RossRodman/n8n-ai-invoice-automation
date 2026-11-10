import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { ExpectedFile } from "./expected.ts";
import { EXPECTED_FILE } from "./paths.ts";
import { getNode, type Item, loadWorkflow, runCode } from "./workflow.ts";

const workflow = loadWorkflow("invoice-processing.json");
const expected = JSON.parse(readFileSync(EXPECTED_FILE, "utf8")) as ExpectedFile;

const SOURCE = {
  gmail_message_id: "19a3f0c2d4e5b6a7",
  email_from: "accounts@budmax.ua",
  email_subject: "Рахунки за листопад",
  received_at: "2026-11-10T09:15:00.000Z",
  file_name: "01-budmax-uah-vat-20.pdf",
};

describe("workflow file", () => {
  it("has unique node names and ids", () => {
    const names = workflow.nodes.map((n) => n.name);
    const ids = workflow.nodes.map((n) => n.id);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only connects nodes that exist", () => {
    const names = new Set(workflow.nodes.map((n) => n.name));
    for (const [from, { main }] of Object.entries(workflow.connections)) {
      expect(names).toContain(from);
      for (const target of main.flat()) expect(names).toContain(target.node);
    }
  });

  it("runs Gmail → OpenAI → Sheets → Slack as one chain", () => {
    const order: string[] = [];
    let current: string | undefined = "Gmail: new invoice email";
    while (current) {
      order.push(current);
      current = workflow.connections[current]?.main[0]?.[0]?.node;
    }
    expect(order).toEqual(workflow.nodes.map((n) => n.name));
  });

  it("ships without credentials", () => {
    for (const node of workflow.nodes) expect(node.credentials).toBeUndefined();
  });

  it("only reads settings that .env.example documents", () => {
    const env = readFileSync(new URL("../../.env.example", import.meta.url), "utf8");
    const used = new Set(JSON.stringify(workflow).match(/\$env\.[A-Z_]+/g));
    expect(used.size).toBeGreaterThan(0);
    for (const ref of used) expect(env).toContain(`${ref.slice("$env.".length)}=`);
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
  const split = (input: Item[]) => runCode(workflow, "Split PDF attachments", { input }) as Item[];

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
    (
      runCode(workflow, "Build extraction request", {
        json: { text },
        nodes: { "Split PDF attachments": SOURCE },
        env,
      }) as { json: { request: Request } }
    ).json.request;

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
});

describe("Parse invoice", () => {
  const answer = (content: unknown) => ({
    choices: [{ message: { role: "assistant", content: JSON.stringify(content) } }],
  });
  const parse = (json: Record<string, unknown>, source = SOURCE) =>
    (
      runCode(workflow, "Parse invoice", { json, nodes: { "Split PDF attachments": source } }) as {
        json: Record<string, unknown>;
      }
    ).json;

  it.each(expected.invoices)("turns the answer for $file into a sheet row", (invoice) => {
    const source = { ...SOURCE, file_name: invoice.file };
    const row = parse(answer({ ...invoice.fields, confidence: 0.93 }), source);

    expect(row).toEqual({
      received_at: SOURCE.received_at,
      ...invoice.fields,
      confidence: 0.93,
      file_name: invoice.file,
      email_from: SOURCE.email_from,
      email_subject: SOURCE.email_subject,
      email_link: `https://mail.google.com/mail/u/0/#all/${SOURCE.gmail_message_id}`,
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
    email_link: "https://mail.google.com/mail/u/0/#all/19a3f0c2d4e5b6a7",
  };
  const format = (invoice: Record<string, unknown>) =>
    (
      runCode(workflow, "Format Slack message", { nodes: { "Parse invoice": invoice } }) as {
        json: { text: string };
      }
    ).json.text;

  it("summarises the invoice", () => {
    expect(format(row)).toBe(
      [
        ":receipt: *New invoice from ТОВ «Будмакс»*",
        "*12 000,00 UAH* · No. INV-2026-0142 · dated 2026-11-03 · due 2026-11-17",
        "VAT 20%: 2 000,00 UAH · 01-budmax-uah-vat-20.pdf",
        "<https://mail.google.com/mail/u/0/#all/19a3f0c2d4e5b6a7|Open the email>",
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

describe("nodes that talk to other services", () => {
  it("reads Gmail with the configured query and downloads attachments", () => {
    expect(getNode(workflow, "Gmail: new invoice email").parameters).toMatchObject({
      simple: false,
      filters: { q: "={{ $env.INVOICE_GMAIL_QUERY }}" },
      options: { downloadAttachments: true },
    });
  });

  it("calls OpenAI with its stored credential and retries", () => {
    const node = getNode(workflow, "OpenAI: extract fields");
    expect(node.parameters).toMatchObject({
      method: "POST",
      url: "https://api.openai.com/v1/chat/completions",
      authentication: "predefinedCredentialType",
      nodeCredentialType: "openAiApi",
    });
    expect(node).toMatchObject({ retryOnFail: true, maxTries: 3 });
  });

  it("appends to the Invoices tab of the configured sheet", () => {
    expect(getNode(workflow, "Sheets: add to Invoices").parameters).toMatchObject({
      operation: "append",
      documentId: { value: "={{ $env.INVOICE_SHEET_ID }}" },
      sheetName: { mode: "name", value: "Invoices" },
    });
  });

  it("posts to the configured Slack channel", () => {
    expect(getNode(workflow, "Slack: post to #invoices").parameters).toMatchObject({
      channelId: { mode: "name", value: "={{ $env.INVOICE_SLACK_CHANNEL }}" },
      text: "={{ $json.text }}",
    });
  });
});
