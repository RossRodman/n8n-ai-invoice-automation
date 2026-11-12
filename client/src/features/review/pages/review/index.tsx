import CloseRounded from "@mui/icons-material/CloseRounded";
import SearchOffRounded from "@mui/icons-material/SearchOffRounded";
import TaskAltRounded from "@mui/icons-material/TaskAltRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  Drawer,
  IconButton,
  Snackbar,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import type { Theme } from "@mui/material/styles";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";

import { EmptyState } from "@/components/emptyState";
import { QueryError } from "@/components/queryError";
import { useInvoices } from "@/hooks/useInvoices";
import { useReviewQueue } from "@/hooks/useReviewQueue";
import { Styled } from "@/styled";
import type { Invoice, ReviewItem, ReviewStatus } from "@/types";
import { formatMoney } from "@/utils/format";
import { countByStatus, itemTitle } from "@/utils/review";

import { ResolvedItem, ReviewEditor, ReviewList, ReviewTabs } from "../../components";

const STATUSES: ReviewStatus[] = ["open", "approved", "rejected"];

const EMPTY: Record<ReviewStatus, { title: string; text: string }> = {
  open: {
    title: "Nothing to review",
    text: "Every invoice so far passed the checks. The ones that need a person show up here.",
  },
  approved: { title: "Nothing approved yet", text: "Invoices you approve here are listed here." },
  rejected: { title: "Nothing rejected", text: "Invoices you reject here are listed here." },
};

interface Toast {
  message: string;
  link?: { to: string; label: string };
}

export function ReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requested = params.get("status") as ReviewStatus | null;
  const status = requested && STATUSES.includes(requested) ? requested : "open";
  const search = status === "open" ? "" : `?status=${status}`;
  const isDesktop = useMediaQuery((theme: Theme) => theme.breakpoints.up("md"), { noSsr: true });

  const queue = useReviewQueue("all");
  const ledger = useInvoices();
  const all = queue.data;
  const items = all?.filter((item) => item.status === status);
  const counts = all ? countByStatus(all) : undefined;

  const fromUrl = id && all ? (all.find((item) => String(item.id) === id) ?? null) : null;
  const selected = id ? fromUrl : isDesktop ? (items?.[0] ?? null) : null;

  const [shown, setShown] = useState<ReviewItem | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  if (selected && selected !== shown) setShown(selected);

  const backToList = () =>
    void navigate({ pathname: "/review", search }, { replace: true, preventScrollReset: true });

  const onApproved = (invoice: Invoice) => {
    setToast({
      message: `Booked ${invoice.supplier_name ?? "the invoice"}, ${formatMoney(invoice.total_amount, invoice.currency)}`,
      link: invoice.invoice_number
        ? {
            to: `/invoices?${new URLSearchParams({ q: invoice.invoice_number }).toString()}`,
            label: "View",
          }
        : undefined,
    });
    backToList();
  };

  const onRejected = (item: ReviewItem) => {
    setToast({ message: `Rejected ${itemTitle(item)}` });
    backToList();
  };

  const detail = (item: ReviewItem) =>
    item.status === "open" ? (
      <ReviewEditor
        key={item.id}
        item={item}
        ledger={ledger.data}
        onApproved={onApproved}
        onRejected={onRejected}
      />
    ) : (
      <Box key={item.id} sx={Styled.PanelBody}>
        <ResolvedItem item={item} />
      </Box>
    );

  const notFound = (
    <EmptyState
      icon={SearchOffRounded}
      title="Not in the Review tab"
      action={
        <Button component={Link} to={{ pathname: "/review", search }}>
          Back to the queue
        </Button>
      }
    >
      It may have been removed from the sheet.
    </EmptyState>
  );

  const empty = (
    <EmptyState icon={TaskAltRounded} title={EMPTY[status].title}>
      {EMPTY[status].text}
    </EmptyState>
  );

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      <div>
        <Typography variant="h2" component="h1">
          Review
        </Typography>
        <Typography sx={Styled.SectionDescription}>
          Invoices the checks held back. Fix what the AI got wrong, then book them or reject them.
        </Typography>
      </div>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <ReviewTabs
          value={status}
          counts={counts}
          onChange={(next) =>
            void navigate({ pathname: "/review", search: next === "open" ? "" : `?status=${next}` })
          }
        />
      </Box>

      {queue.isError ? (
        <QueryError
          title="Couldn't load the review queue"
          error={queue.error}
          onRetry={() => void queue.refetch()}
        />
      ) : (
        <Card
          sx={{
            flex: { md: 1 },
            minHeight: { md: 360 },
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              md: "minmax(240px, 320px) minmax(0, 1fr)",
            },
          }}
        >
          {items?.length === 0 && !(isDesktop && id) ? (
            <Box sx={{ gridColumn: "1 / -1", alignSelf: "center" }}>{empty}</Box>
          ) : (
            <>
              <Box
                sx={{
                  overflowY: { md: "auto" },
                  minHeight: 0,
                  borderRight: { md: 1 },
                  borderColor: { md: "divider" },
                }}
              >
                {items?.length === 0 ? (
                  empty
                ) : (
                  <ReviewList items={items} selectedId={selected?.id ?? null} search={search} />
                )}
              </Box>

              {isDesktop && (
                <Box
                  aria-live="polite"
                  sx={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}
                >
                  {selected ? detail(selected) : id && all ? notFound : null}
                </Box>
              )}
            </>
          )}
        </Card>
      )}

      {!isDesktop && (
        <Drawer
          anchor="right"
          open={Boolean(id) && Boolean(all)}
          onClose={backToList}
          slotProps={{
            paper: {
              role: "dialog",
              "aria-labelledby": "review-item-title",
              sx: { width: "100%", display: "flex", flexDirection: "column" },
            },
          }}
        >
          <Stack direction="row" sx={{ alignItems: "center", px: 2, pt: 1.5 }}>
            <Typography variant="overline" sx={{ color: "text.secondary", flex: 1 }}>
              Review
            </Typography>
            <IconButton aria-label="Close" onClick={backToList} edge="end">
              <CloseRounded />
            </IconButton>
          </Stack>
          {selected ? detail(selected) : id ? notFound : shown && detail(shown)}
        </Drawer>
      )}

      <Snackbar
        open={toast !== null}
        autoHideDuration={6000}
        onClose={(_event, reason) => reason !== "clickaway" && setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setToast(null)}
          action={
            toast?.link && (
              <Button color="inherit" size="small" component={Link} to={toast.link.to}>
                {toast.link.label}
              </Button>
            )
          }
          sx={{ alignItems: "center" }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
