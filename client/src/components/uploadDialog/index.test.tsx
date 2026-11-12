import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { mockApi, renderRoute } from "@/test/utils";

describe("UploadDialog", () => {
  it("sends PDFs to n8n and refuses other files", async () => {
    const calls = mockApi({
      "GET /healthz": { status: "ok" },
      "POST /api/upload": Response.json(
        { status: "processing", file_name: "a.pdf" },
        { status: 202 },
      ),
    });
    renderRoute("/how-it-works");

    await userEvent.click(screen.getAllByRole("button", { name: "Upload PDF" })[0]!);
    const dialog = await screen.findByRole("dialog", { name: "Upload invoices" });
    const pdf = new File(["%PDF-1.7"], "a.pdf", { type: "application/pdf" });
    const text = new File(["hello"], "notes.txt", { type: "text/plain" });
    await userEvent.upload(within(dialog).getByLabelText("Choose PDF files"), [pdf, text], {
      applyAccept: false,
    });

    const uploads = within(dialog).getByRole("list", { name: "Uploads" });
    expect(await within(uploads).findByLabelText("Uploaded")).toBeInTheDocument();
    expect(within(uploads).getByText("Not a PDF")).toBeInTheDocument();
    expect(within(dialog).getByRole("status")).toHaveTextContent("n8n is reading it now");
    expect(calls.filter((call) => call.key === "POST /api/upload")).toHaveLength(1);
  });

  it("shows n8n's error for a file it refused", async () => {
    mockApi({
      "GET /healthz": { status: "ok" },
      "POST /api/upload": Response.json(
        { message: "The PDF is larger than 10 MB" },
        { status: 413 },
      ),
    });
    renderRoute("/how-it-works");

    await userEvent.click(screen.getAllByRole("button", { name: "Upload PDF" })[0]!);
    const dialog = await screen.findByRole("dialog", { name: "Upload invoices" });
    await userEvent.upload(
      within(dialog).getByLabelText("Choose PDF files"),
      new File(["%PDF"], "big.pdf", { type: "application/pdf" }),
    );

    expect(await within(dialog).findByText("The PDF is larger than 10 MB")).toBeInTheDocument();
  });
});
