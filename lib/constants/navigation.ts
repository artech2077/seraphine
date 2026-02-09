import {
  Building2Icon,
  FileTextIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  LineChartIcon,
  PackageIcon,
  SettingsIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react"

export type NavItem = {
  title: string
  href: string
  icon: typeof LayoutDashboardIcon
}

const appBasePath = "/app"

export const mainNavItems: NavItem[] = [
  {
    title: "Tableau de bord",
    href: appBasePath,
    icon: LayoutDashboardIcon,
  },
  {
    title: "Ventes",
    href: `${appBasePath}/ventes`,
    icon: ShoppingBagIcon,
  },
  {
    title: "Produit",
    href: `${appBasePath}/produit`,
    icon: PackageIcon,
  },
  {
    title: "Achats",
    href: `${appBasePath}/achats`,
    icon: ShoppingCartIcon,
  },
  {
    title: "Fournisseurs",
    href: `${appBasePath}/fournisseurs`,
    icon: Building2Icon,
  },
  {
    title: "Clients",
    href: `${appBasePath}/clients`,
    icon: UsersIcon,
  },
  {
    title: "Réconciliation caisse",
    href: `${appBasePath}/reconciliation-caisse`,
    icon: WalletIcon,
  },
  {
    title: "Rapports",
    href: `${appBasePath}/rapports`,
    icon: FileTextIcon,
  },
  {
    title: "Analytique",
    href: `${appBasePath}/analytique`,
    icon: LineChartIcon,
  },
]

export const utilityNavItems: NavItem[] = [
  {
    title: "Paramètres",
    href: `${appBasePath}/parametres`,
    icon: SettingsIcon,
  },
  {
    title: "Assistance",
    href: `${appBasePath}/assistance`,
    icon: HelpCircleIcon,
  },
]

export function getPageTitle(pathname: string) {
  const match = [...mainNavItems, ...utilityNavItems].find((item) =>
    item.href === appBasePath ? pathname === appBasePath : pathname.startsWith(item.href)
  )

  return match?.title ?? "Tableau de bord"
}
