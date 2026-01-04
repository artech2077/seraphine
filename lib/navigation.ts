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

export const mainNavItems: NavItem[] = [
  {
    title: "Tableau de bord",
    href: "/",
    icon: LayoutDashboardIcon,
  },
  {
    title: "Ventes",
    href: "/ventes",
    icon: ShoppingBagIcon,
  },
  {
    title: "Inventaire",
    href: "/inventaire",
    icon: PackageIcon,
  },
  {
    title: "Achats",
    href: "/achats",
    icon: ShoppingCartIcon,
  },
  {
    title: "Fournisseurs",
    href: "/fournisseurs",
    icon: Building2Icon,
  },
  {
    title: "Clients",
    href: "/clients",
    icon: UsersIcon,
  },
  {
    title: "Réconciliation caisse",
    href: "/reconciliation-caisse",
    icon: WalletIcon,
  },
  {
    title: "Rapports",
    href: "/rapports",
    icon: FileTextIcon,
  },
  {
    title: "Analytique",
    href: "/analytique",
    icon: LineChartIcon,
  },
]

export const utilityNavItems: NavItem[] = [
  {
    title: "Paramètres",
    href: "/parametres",
    icon: SettingsIcon,
  },
  {
    title: "Assistance",
    href: "/assistance",
    icon: HelpCircleIcon,
  },
]

export function getPageTitle(pathname: string) {
  const match = [...mainNavItems, ...utilityNavItems].find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  )

  return match?.title ?? "Tableau de bord"
}
