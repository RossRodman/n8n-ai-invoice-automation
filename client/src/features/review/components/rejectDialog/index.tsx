import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@mui/material";

interface RejectDialogProps {
  open: boolean;
  title: string;
  note: string;
  pending: boolean;
  error: Error | null;
  onNote: (note: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RejectDialog({
  open,
  title,
  note,
  pending,
  error,
  onNote,
  onCancel,
  onConfirm,
}: RejectDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={pending ? undefined : onCancel}
      fullWidth
      maxWidth="xs"
      aria-labelledby="reject-title"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onConfirm();
        }}
      >
        <DialogTitle id="reject-title">Reject this invoice?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {title} won&apos;t go into the books. The row stays in the Review tab, marked rejected.
          </DialogContentText>
          <TextField
            label="Reason"
            placeholder="A quote, spam, sent twice…"
            helperText="Optional. Saved with the row."
            value={note}
            onChange={(event) => onNote(event.target.value)}
            fullWidth
            multiline
            minRows={2}
            autoFocus
          />
          {error && (
            <Alert severity="error" variant="outlined" sx={{ mt: 2 }}>
              {error.message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="error" loading={pending}>
            Reject
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
