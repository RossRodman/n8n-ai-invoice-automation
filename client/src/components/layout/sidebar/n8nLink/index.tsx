import AccountTreeOutlined from "@mui/icons-material/AccountTreeOutlined";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import { Card, CardActionArea, Stack, Typography } from "@mui/material";

import { N8N_EDITOR_URL } from "@/constants";

export function N8nLink() {
  return (
    <Card>
      <CardActionArea href={N8N_EDITOR_URL} target="_blank" rel="noreferrer" sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <AccountTreeOutlined fontSize="small" color="primary" />
          <Stack sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Open n8n
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: "text.secondary" }}>
              Workflow editor
            </Typography>
          </Stack>
          <OpenInNewRounded sx={{ fontSize: 16, color: "text.secondary" }} />
        </Stack>
      </CardActionArea>
    </Card>
  );
}
