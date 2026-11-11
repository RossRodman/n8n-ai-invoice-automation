import AutoAwesomeOutlined from "@mui/icons-material/AutoAwesomeOutlined";
import FactCheckOutlined from "@mui/icons-material/FactCheckOutlined";
import ForumOutlined from "@mui/icons-material/ForumOutlined";
import MailOutlined from "@mui/icons-material/MailOutlined";
import TableChartOutlined from "@mui/icons-material/TableChartOutlined";
import type { SvgIconComponent } from "@mui/icons-material";

export interface PipelineStep {
  title: string;
  detail: string;
  icon: SvgIconComponent;
}

export const PIPELINE_STEPS: PipelineStep[] = [
  {
    title: "Gmail",
    detail: "New emails with a PDF attachment start the workflow.",
    icon: MailOutlined,
  },
  {
    title: "AI extraction",
    detail: "OpenAI reads each PDF and returns the fields as strict JSON.",
    icon: AutoAwesomeOutlined,
  },
  {
    title: "Checks",
    detail: "Required fields, amounts that add up, dates, duplicates, confidence.",
    icon: FactCheckOutlined,
  },
  {
    title: "Google Sheets",
    detail: "Good invoices go into the ledger; the rest into the review tab.",
    icon: TableChartOutlined,
  },
  {
    title: "Slack",
    detail: "A message for every invoice, and an alert when one needs a person.",
    icon: ForumOutlined,
  },
];
