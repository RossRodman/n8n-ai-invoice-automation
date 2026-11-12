import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { ReviewItem } from "@/types";
import { INVOICES, makeReviewItem, REVIEW_ITEMS } from "@/test/fixtures/invoices";
import { mockApi, renderRoute } from "@/test/utils";

const APPROVED = makeReviewItem({
  id: 7,
  status: "approved",
  received_at: "2026-10-20T08:00:00.000Z",
  resolved_at: "2026-10-21T10:15:00.000Z",
  resolution_note: "Confirmed by phone",
  supplier_name: "ТОВ «Київстар»",
  review_reasons: ["low_confidence"],
});

const MISMATCH = makeReviewItem({
  ...REVIEW_ITEMS[1]!,
  supplier_tax_id: "38765412",
  invoice_date: "2026-11-06",
});

function setup(items: ReviewItem[] = [REVIEW_ITEMS[0]!, MISMATCH, APPROVED], handlers = {}) {
  return mockApi({
    "GET /healthz": { status: "ok" },
    "GET /api/invoices": { invoices: INVOICES },
    "GET /api/review": { items },
    ...handlers,
  });
}

async function openItem(name: string) {
  const list = await screen.findByRole("list", { name: "Review items" });
  await userEvent.click(within(list).getByRole("link", { name: new RegExp(name) }));

  return screen.findByRole("dialog");
}

describe("ReviewPage", () => {
  it("lists the open items with why they were held back", async () => {
    setup();
    renderRoute("/review");

    const list = await screen.findByRole("list", { name: "Review items" });
    const links = within(list).getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[1]).toHaveTextContent("ТОВ «Офіс Плюс»");
    expect(links[1]).toHaveTextContent("Amounts don't add up");
    expect(screen.getByRole("tab", { name: /Open\s*2/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Approved\s*1/ })).toBeInTheDocument();
  });

  it("fixes the total and approves only what changed", async () => {
    const calls = setup(undefined, {
      "POST /api/review/approve": (body: { fields: object }) => ({
        invoice: { ...MISMATCH, ...body.fields },
      }),
    });
    renderRoute("/review");

    const dialog = await openItem("Офіс Плюс");
    const approve = within(dialog).getByRole("button", { name: "Approve and book" });
    expect(approve).toBeDisabled();
    expect(within(dialog).getByText("1 check fails")).toBeInTheDocument();

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Set the total to UAH 10,140.00" }),
    );
    expect(within(dialog).getByRole("textbox", { name: /Total/ })).toHaveValue("10140.00");
    expect(within(dialog).getByText("Was: 10240")).toBeInTheDocument();

    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Note for the team" }),
      "Checked",
    );
    await userEvent.click(approve);

    await waitFor(() =>
      expect(calls.find((call) => call.key === "POST /api/review/approve")?.body).toEqual({
        id: 2,
        fields: { total_amount: 10140 },
        note: "Checked",
      }),
    );
    expect(await screen.findByText("Booked ТОВ «Офіс Плюс», UAH 10,140.00")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      "/invoices?q=%D0%9E%D0%9F-5531",
    );
  });

  it("shows why n8n refused an approval", async () => {
    const ok = makeReviewItem({
      ...INVOICES[0]!,
      id: 5,
      invoice_number: "28",
      review_reasons: ["low_confidence"],
    });
    setup([ok], {
      "POST /api/review/approve": Response.json(
        {
          message: "The invoice can't go into the books yet",
          problems: ["Invoice 28 is already in the books"],
        },
        { status: 422 },
      ),
    });
    renderRoute("/review");

    const dialog = await openItem("Коваленко");
    await userEvent.click(within(dialog).getByRole("button", { name: "Approve and book" }));

    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent("The invoice can't go into the books yet");
    expect(alert).toHaveTextContent("Invoice 28 is already in the books");
  });

  it("warns about a duplicate before sending", async () => {
    setup([makeReviewItem({ ...INVOICES[0]!, id: 5, review_reasons: ["duplicate"] })]);
    renderRoute("/review");

    const dialog = await openItem("Коваленко");
    const checks = within(dialog).getByRole("list", { name: "Checks" });
    await waitFor(() => expect(within(checks).getByText(/already booked/)).toBeInTheDocument());
    expect(within(dialog).getByRole("button", { name: "Approve and book" })).toBeDisabled();
  });

  it("rejects an item with a reason", async () => {
    const calls = setup(undefined, {
      "POST /api/review/reject": {
        id: 3,
        status: "rejected",
        resolved_at: "2026-11-11T10:00:00.000Z",
      },
    });
    renderRoute("/review");

    const dialog = await openItem("tekhnoservis");
    await userEvent.click(within(dialog).getByRole("button", { name: "Reject" }));
    const confirm = await screen.findByRole("dialog", { name: "Reject this invoice?" });
    await userEvent.type(within(confirm).getByRole("textbox", { name: "Reason" }), "Sent twice");
    await userEvent.click(within(confirm).getByRole("button", { name: "Reject" }));

    expect(await screen.findByText("Rejected 05-tekhnoservis-scanned.pdf")).toBeInTheDocument();
    expect(calls.find((call) => call.key === "POST /api/review/reject")?.body).toEqual({
      id: 3,
      note: "Sent twice",
    });
    expect(calls.some((call) => call.key === "POST /api/review/approve")).toBe(false);
  });

  it("shows what was decided on a resolved item", async () => {
    setup();
    renderRoute("/review?status=approved");

    const dialog = await openItem("Київстар");
    expect(within(dialog).getByText("Confirmed by phone")).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: "Approve and book" }),
    ).not.toBeInTheDocument();
  });

  it("says when nothing is waiting", async () => {
    setup([]);
    renderRoute("/review");

    expect(await screen.findByText("Nothing to review")).toBeInTheDocument();
  });

  it("counts the open items in the sidebar", async () => {
    setup(REVIEW_ITEMS);
    renderRoute("/review");

    expect((await screen.findAllByLabelText("2 open")).length).toBeGreaterThan(0);
  });
});
