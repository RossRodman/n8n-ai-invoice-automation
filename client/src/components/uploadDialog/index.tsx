import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import ErrorRounded from "@mui/icons-material/ErrorRounded";
import PictureAsPdfOutlined from "@mui/icons-material/PictureAsPdfOutlined";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { type ChangeEvent, type DragEvent, useId, useState } from "react";

import { api } from "@/api";
import { Styled } from "@/styled";
import { formatSize, uploadProblem } from "@/utils/upload";

type UploadState = { kind: "sending" } | { kind: "sent" } | { kind: "failed"; message: string };

interface Upload {
  key: number;
  name: string;
  size: number;
  state: UploadState;
}

let nextKey = 0;

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
}

export function UploadDialog({ open, onClose }: UploadDialogProps) {
  const inputId = useId();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const sending = uploads.some((upload) => upload.state.kind === "sending");

  const update = (key: number, state: UploadState) =>
    setUploads((current) =>
      current.map((upload) => (upload.key === key ? { ...upload, state } : upload)),
    );

  const send = (files: File[]) => {
    const added = files.map((file) => {
      const problem = uploadProblem(file);
      const upload: Upload = {
        key: nextKey++,
        name: file.name,
        size: file.size,
        state: problem ? { kind: "failed", message: problem } : { kind: "sending" },
      };

      if (!problem) {
        api.upload(file).then(
          () => update(upload.key, { kind: "sent" }),
          (error: unknown) =>
            update(upload.key, {
              kind: "failed",
              message: error instanceof Error ? error.message : "Upload failed",
            }),
        );
      }

      return upload;
    });

    setUploads((current) => [...added, ...current]);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    send([...event.dataTransfer.files]);
  };

  const close = () => {
    // Finished uploads are cleared; ones still sending stay listed.
    setUploads((current) => current.filter((upload) => upload.state.kind === "sending"));
    onClose();
  };

  const sent = uploads.filter((upload) => upload.state.kind === "sent").length;

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="sm"
      aria-labelledby="upload-title"
      keepMounted
    >
      <DialogTitle id="upload-title" sx={{ pb: 0.5 }}>
        Upload invoices
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2.5 }}>
          Each PDF goes through the same steps as an emailed one: the AI reads it, the checks run,
          and it lands in the Invoices tab or in Review.
        </Typography>

        <Box
          component="label"
          htmlFor={inputId}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          sx={{
            display: "grid",
            justifyItems: "center",
            gap: 1,
            px: 3,
            py: 4,
            borderRadius: 3,
            border: 2,
            borderStyle: "dashed",
            borderColor: dragging ? "primary.main" : "divider",
            bgcolor: dragging
              ? "rgb(var(--mui-palette-primary-mainChannel) / 0.06)"
              : "transparent",
            textAlign: "center",
            cursor: "pointer",
            transition: "border-color 120ms, background-color 120ms",
            "&:hover": { borderColor: "primary.main" },
            "&:focus-within": { borderColor: "primary.main", outline: "none" },
          }}
        >
          <CloudUploadOutlined sx={{ fontSize: 36, color: "primary.main" }} />
          <Typography sx={{ fontWeight: 600 }}>
            Drop PDFs here or{" "}
            <Box component="span" sx={{ color: "primary.main" }}>
              choose files
            </Box>
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            PDF only, up to 10 MB each
          </Typography>
          <Box
            component="input"
            id={inputId}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            aria-label="Choose PDF files"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              send([...(event.target.files ?? [])]);
              event.target.value = "";
            }}
            sx={Styled.VisuallyHidden}
          />
        </Box>

        {uploads.length > 0 && (
          <Stack
            component="ul"
            spacing={1}
            aria-label="Uploads"
            sx={{ listStyle: "none", p: 0, m: 0, mt: 2 }}
          >
            {uploads.map((upload) => (
              <UploadRow key={upload.key} upload={upload} />
            ))}
          </Stack>
        )}

        {sent > 0 && !sending && (
          <Typography variant="body2" role="status" sx={{ color: "text.secondary", mt: 2 }}>
            n8n is reading {sent === 1 ? "it" : "them"} now. {sent === 1 ? "It shows" : "They show"}{" "}
            up in Invoices or Review in about a minute, with a message in Slack.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant={sent > 0 && !sending ? "contained" : "text"} onClick={close}>
          {sent > 0 && !sending ? "Done" : "Close"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function UploadRow({ upload }: { upload: Upload }) {
  const { state } = upload;

  return (
    <Stack
      component="li"
      direction="row"
      spacing={1.5}
      sx={{ alignItems: "center", px: 1.5, py: 1, borderRadius: 2, bgcolor: "action.hover" }}
    >
      <PictureAsPdfOutlined sx={{ color: "text.secondary" }} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {upload.name}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: state.kind === "failed" ? "error.main" : "text.secondary" }}
        >
          {state.kind === "failed"
            ? state.message
            : state.kind === "sent"
              ? `${formatSize(upload.size)} · processing`
              : `${formatSize(upload.size)} · uploading…`}
        </Typography>
      </Box>
      {state.kind === "sending" && <CircularProgress size={18} aria-label="Uploading" />}
      {state.kind === "sent" && (
        <CheckCircleRounded aria-label="Uploaded" sx={{ color: "success.main" }} />
      )}
      {state.kind === "failed" && (
        <ErrorRounded aria-label="Not uploaded" sx={{ color: "error.main" }} />
      )}
    </Stack>
  );
}
