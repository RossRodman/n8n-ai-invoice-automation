import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import type { SvgIconComponent } from "@mui/icons-material";

export interface NavItem {
  to: string;
  label: string;
  icon: SvgIconComponent;
}

export const NAV_ITEMS: NavItem[] = [{ to: "/", label: "Dashboard", icon: DashboardOutlined }];
