import GitHub from "@mui/icons-material/GitHub";
import { IconButton, Tooltip } from "@mui/material";

import { REPO_URL } from "@/constants";

export function SourceLink() {
  return (
    <Tooltip title="Source on GitHub">
      <IconButton aria-label="Source on GitHub" href={REPO_URL} target="_blank" rel="noreferrer">
        <GitHub fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
