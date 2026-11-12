import AccountTreeOutlined from "@mui/icons-material/AccountTreeOutlined";
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import FactCheckOutlined from "@mui/icons-material/FactCheckOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import type { SvgIconComponent } from "@mui/icons-material";

export interface NavItem {
  to: string;
  label: string;
  icon: SvgIconComponent;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: DashboardOutlined },
  { to: "/invoices", label: "Invoices", icon: ReceiptLongOutlined },
  { to: "/review", label: "Review", icon: FactCheckOutlined },
  { to: "/how-it-works", label: "How it works", icon: AccountTreeOutlined },
];
