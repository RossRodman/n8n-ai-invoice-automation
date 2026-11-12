import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import ErrorRounded from "@mui/icons-material/ErrorRounded";
import RemoveCircleOutlineRounded from "@mui/icons-material/RemoveCircleOutlineRounded";
import { Box, Button, Stack, Typography } from "@mui/material";

import type { EditableField } from "@/types";
import type { CheckState, ReviewCheck } from "@/utils/review";

const ICONS: Record<CheckState, { icon: typeof CheckCircleRounded; color: string; text: string }> =
  {
    pass: { icon: CheckCircleRounded, color: "success.main", text: "Passed" },
    fail: { icon: ErrorRounded, color: "error.main", text: "Failed" },
    skip: { icon: RemoveCircleOutlineRounded, color: "text.disabled", text: "Not checked yet" },
  };

interface ReviewChecksProps {
  checks: ReviewCheck[];
  onFix: (field: EditableField, value: string) => void;
}

export function ReviewChecks({ checks, onFix }: ReviewChecksProps) {
  return (
    <Stack component="ul" spacing={1} aria-label="Checks" sx={{ listStyle: "none", p: 0, m: 0 }}>
      {checks.map((check) => {
        const { icon: Icon, color, text } = ICONS[check.state];

        return (
          <Stack
            component="li"
            key={check.id}
            direction="row"
            spacing={1.25}
            data-state={check.state}
            sx={{ alignItems: "flex-start" }}
          >
            <Icon aria-label={text} sx={{ color, fontSize: 20, mt: "1px" }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: check.state === "skip" ? "text.secondary" : "text.primary",
                }}
              >
                {check.label}
              </Typography>
              {check.detail && (
                <Typography variant="caption" component="p" sx={{ color: "text.secondary" }}>
                  {check.detail}
                </Typography>
              )}
              {check.fix && (
                <Button
                  size="small"
                  onClick={() => check.fix && onFix(check.fix.field, check.fix.value)}
                  sx={{ mt: 0.25, ml: -0.75, py: 0 }}
                >
                  {check.fix.label}
                </Button>
              )}
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}
