import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  InputAdornment,
  Stack,
  TextField,
  type TextFieldProps,
  Typography,
} from "@mui/material";
import { type ReactNode, useState } from "react";

import { ApiError } from "@/api";
import { Styled } from "@/styled";
import type { EditableField, Invoice, ReviewItem } from "@/types";
import {
  corrections,
  FIELD_LABELS,
  isIsoDate,
  isNumberField,
  itemTitle,
  parseAmount,
  reviewChecks,
  toForm,
  type ReviewForm,
} from "@/utils/review";

import { useApprove, useReject } from "../../hooks";
import { ItemHeading } from "../itemHeading";
import { RejectDialog } from "../rejectDialog";
import { ReviewChecks } from "../reviewChecks";

const REQUIRED = new Set<EditableField>([
  "supplier_name",
  "invoice_number",
  "invoice_date",
  "currency",
  "net_amount",
  "vat_amount",
  "total_amount",
]);

interface ReviewEditorProps {
  item: ReviewItem;
  ledger: Invoice[] | undefined;
  onApproved: (invoice: Invoice) => void;
  onRejected: (item: ReviewItem) => void;
}

export function ReviewEditor({ item, ledger, onApproved, onRejected }: ReviewEditorProps) {
  const [original] = useState(() => toForm(item));
  const [form, setForm] = useState<ReviewForm>(original);
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const approve = useApprove();
  const reject = useReject();

  const checks = reviewChecks(form, ledger);
  const failed = checks.filter((check) => check.state === "fail");
  const changes = corrections(item, form);
  const changed = Object.keys(changes).length;
  const currency = /^[A-Za-z]{3}$/.test(form.currency.trim())
    ? form.currency.trim().toUpperCase()
    : "";
  const problems = approve.error instanceof ApiError ? approve.error.problems : [];

  const set = (field: EditableField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (approve.error) approve.reset();
  };

  const fieldError = (field: EditableField): boolean => {
    const value = form[field].trim();
    if (value === "") return REQUIRED.has(field);
    if (isNumberField(field)) return Number.isNaN(parseAmount(value));
    if (field === "invoice_date" || field === "due_date") return !isIsoDate(value);
    if (field === "currency") return !/^[A-Za-z]{3}$/.test(value);

    return false;
  };

  const field = (name: EditableField, extra: TextFieldProps = {}) => {
    const was = original[name];
    const edited = form[name] !== was;

    return (
      <TextField
        size="small"
        name={name}
        label={FIELD_LABELS[name]}
        value={form[name]}
        onChange={(event) => set(name, event.target.value)}
        required={REQUIRED.has(name)}
        error={fieldError(name)}
        helperText={edited ? `Was: ${was || "empty"}` : undefined}
        fullWidth
        {...extra}
        slotProps={{
          ...extra.slotProps,
          inputLabel: { shrink: true },
          formHelperText: { sx: { color: "primary.main", mx: 0.5 } },
        }}
      />
    );
  };

  const amount = (name: EditableField, unit: string) =>
    field(name, {
      placeholder: "0.00",
      slotProps: {
        htmlInput: { inputMode: "decimal", style: { fontVariantNumeric: "tabular-nums" } },
        input: {
          sx: Styled.Mono,
          endAdornment: unit ? <InputAdornment position="end">{unit}</InputAdornment> : undefined,
        },
      },
    });

  const submit = async () => {
    try {
      const invoice = await approve.mutateAsync({
        id: item.id,
        ...(changed ? { fields: changes } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      onApproved(invoice);
    } catch {}
  };

  const confirmReject = async () => {
    try {
      await reject.mutateAsync({
        id: item.id,
        ...(rejectNote.trim() ? { note: rejectNote.trim() } : {}),
      });
      setRejecting(false);
      onRejected(item);
    } catch {}
  };

  return (
    <>
      <Box
        component="form"
        aria-labelledby="review-item-title"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!failed.length) void submit();
        }}
        sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
      >
        <Box sx={[Styled.PanelBody, { p: { xs: 2, sm: 3 } }]}>
          <Stack spacing={3}>
            <ItemHeading item={item} />

            {item.review_details && (
              <Alert severity="warning" variant="outlined">
                {item.review_details}
              </Alert>
            )}

            <Box
              sx={{
                display: "grid",
                gap: 3,
                gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) 248px" },
                alignItems: "start",
              }}
            >
              <Stack spacing={3}>
                <FieldGroup title="Invoice">
                  <Box sx={{ gridColumn: "1 / -1" }}>{field("supplier_name")}</Box>
                  {field("supplier_tax_id", { slotProps: { input: { sx: Styled.Mono } } })}
                  {field("invoice_number", { slotProps: { input: { sx: Styled.Mono } } })}
                  {field("invoice_date", { type: "date" })}
                  {field("due_date", { type: "date" })}
                  {field("currency", {
                    placeholder: "UAH",
                    slotProps: {
                      htmlInput: { maxLength: 3, style: { textTransform: "uppercase" } },
                      input: { sx: Styled.Mono },
                    },
                  })}
                </FieldGroup>

                <FieldGroup title="Amounts">
                  {amount("net_amount", currency)}
                  {amount("vat_rate", "%")}
                  {amount("vat_amount", currency)}
                  {amount("total_amount", currency)}
                </FieldGroup>

                <TextField
                  size="small"
                  label="Note for the team"
                  placeholder="Confirmed the total with the supplier"
                  helperText="Optional. Posted to Slack with the approval."
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  multiline
                  minRows={2}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Stack>

              <Box
                component="section"
                aria-labelledby="checks-title"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "action.hover",
                  position: { lg: "sticky" },
                  top: 0,
                }}
              >
                <Typography id="checks-title" variant="h4" component="h3" sx={{ mb: 1.5 }}>
                  Checks
                </Typography>
                <ReviewChecks checks={checks} onFix={set} />
              </Box>
            </Box>

            {approve.error && (
              <Alert severity="error" variant="outlined" role="alert">
                <AlertTitle>{approve.error.message}</AlertTitle>
                {problems.length > 0 && (
                  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {problems.map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </Box>
                )}
              </Alert>
            )}
          </Stack>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            px: { xs: 2, sm: 3 },
            py: 1.5,
            borderTop: 1,
            borderColor: "divider",
            flexWrap: "wrap",
            rowGap: 1,
          }}
        >
          <Button
            variant="outlined"
            color="error"
            onClick={() => setRejecting(true)}
            disabled={approve.isPending}
          >
            Reject
          </Button>
          {changed > 0 && (
            <Button
              startIcon={<RestartAltRounded />}
              onClick={() => {
                setForm(original);
                approve.reset();
              }}
              disabled={approve.isPending}
            >
              Undo {changed} {changed === 1 ? "change" : "changes"}
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          {failed.length > 0 && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {failed.length === 1 ? "1 check fails" : `${failed.length} checks fail`}
            </Typography>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={failed.length > 0}
            loading={approve.isPending}
          >
            Approve and book
          </Button>
        </Stack>
      </Box>

      <RejectDialog
        open={rejecting}
        title={itemTitle(item)}
        note={rejectNote}
        pending={reject.isPending}
        error={reject.error}
        onNote={setRejectNote}
        onCancel={() => {
          setRejecting(false);
          reject.reset();
        }}
        onConfirm={() => void confirmReject()}
      />
    </>
  );
}

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
      <Typography component="legend" variant="h4" sx={{ mb: 1.5, p: 0 }}>
        {title}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
