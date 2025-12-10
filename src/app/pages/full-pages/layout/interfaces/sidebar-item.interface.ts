export interface SidebarItem {
  id: string;
  label: string;
  icon?: string;
  routerLink?: string | string[];
  command?: () => void;
  items?: SidebarItem[];
  badge?: string;
  badgeClass?: string;
  visible?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

