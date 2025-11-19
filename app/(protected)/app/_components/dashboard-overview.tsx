import Link from "next/link"
import { ArrowDownRight, ArrowUpRight, Boxes, ClipboardList, ShoppingBag, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardMetrics } from "@/lib/dashboard/queries"
import type { Database } from "@/types/database"

const currencyFormatter = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat("fr-MA")

const quickLinks = [
  {
    title: "Ventes",
    description: "Encaisser une nouvelle vente",
    href: "/app/sales",
    icon: ShoppingBag,
  },
  {
    title: "Inventaire",
    description: "Consulter les stocks",
    href: "/app/inventory",
    icon: Boxes,
  },
  {
    title: "Fournisseurs",
    description: "Mettre à jour vos partenaires",
    href: "/app/suppliers",
    icon: ClipboardList,
  },
  {
    title: "Clients",
    description: "Suivre les comptes à crédit",
    href: "/app/clients",
    icon: Users,
  },
] as const

const quickLinksEnabled = process.env.NEXT_PUBLIC_ENABLE_QUICK_LINKS === "true"

type DashboardOverviewProps = {
  pharmacyId: string
  role?: Database["public"]["Enums"]["user_role"]
}

export async function DashboardOverview({ pharmacyId, role }: DashboardOverviewProps) {
  const metrics = await getDashboardMetrics(pharmacyId)

  const salesTrend = buildTrendLabel(metrics.sales.total, metrics.sales.previousTotal)
  const salesFooter = buildSalesFooter(metrics.sales.transactionCount, metrics.sales.lastSaleAt)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Ventes aujourd'hui"
          description={salesTrend?.label ?? "Activité stable"}
          value={currencyFormatter.format(metrics.sales.total)}
          footer={salesFooter}
          trend={salesTrend}
          highlightTrend
        />

        <MetricCard
          title="Alertes stock"
          description="Produits au seuil critique"
          value={numberFormatter.format(metrics.stockAlerts.total)}
          footer="Suivi en temps réel par pharmacie"
          trend={{ direction: metrics.stockAlerts.total > 0 ? "down" : "flat", label: metrics.stockAlerts.total > 0 ? "Vérifier" : "Stable" }}
        />

        <MetricCard
          title={`Prévision ${metrics.forecast.windowDays} jours`}
          description="Moyenne mobile des ventes"
          value={currencyFormatter.format(metrics.forecast.movingAverage)}
          footer={`Dernier jour : ${currencyFormatter.format(metrics.forecast.latestTotal)}`}
          trend={{ direction: "flat", label: "Projection" }}
        />

        {quickLinksEnabled ? <QuickActionsCard role={role} /> : <UpcomingActionsCard />}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Alertes critiques</CardTitle>
            <CardDescription>Produits qui nécessitent un réassort immédiat.</CardDescription>
          </div>
          <Badge variant={metrics.stockAlerts.total > 0 ? "destructive" : "outline"}>
            {metrics.stockAlerts.total > 0
              ? `${metrics.stockAlerts.total} produits à surveiller`
              : "Aucune alerte"}
          </Badge>
        </CardHeader>
        <CardContent>
          {metrics.stockAlerts.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Vous recevrez vos premières alertes dès que des seuils seront atteints.
            </p>
          ) : (
            <ul className="space-y-4">
              {metrics.stockAlerts.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border/60 p-4">
                  <div>
                    <p className="font-medium leading-tight">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Stock actuel : {numberFormatter.format(item.stock)} / seuil {numberFormatter.format(item.lowStockThreshold)}
                      {item.supplierName ? ` • Fournisseur : ${item.supplierName}` : null}
                    </p>
                  </div>
                  <Badge variant={item.stock <= 0 ? "destructive" : "warning"} className="shrink-0">
                    Priorité
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

type MetricCardProps = {
  title: string
  description?: string
  value: string
  footer?: string
  trend?: TrendLabel
  highlightTrend?: boolean
}

function MetricCard({ title, description, value, footer, trend, highlightTrend }: MetricCardProps) {
  const showTrendCallout = Boolean(highlightTrend && trend && description)
  return (
    <Card className="flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-accent-foreground">{title}</p>
        </div>
        {trend ? <TrendBadge trend={trend} /> : null}
      </div>
      <p className="mt-6 text-4xl font-semibold tracking-tight text-foreground">{value}</p>
      {description ? (
        <p className="mt-4 flex items-center gap-1 text-sm font-semibold text-foreground">
          {description}
          {showTrendCallout ? <ArrowUpRight className="h-4 w-4" /> : null}
        </p>
      ) : null}
      {footer ? <p className="mt-1 text-sm text-muted-foreground">{footer}</p> : null}
    </Card>
  )
}

type TrendLabel = {
  direction: "up" | "down" | "flat"
  label: string
}

function TrendBadge({ trend }: { trend: TrendLabel }) {
  const isUp = trend.direction === "up"
  const isDown = trend.direction === "down"
  const Icon = isDown ? ArrowDownRight : ArrowUpRight
  const tone = isUp ? "text-accent-foreground" : isDown ? "text-destructive" : "text-muted-foreground"
  const background = isUp ? "bg-accent/10 border-accent/30" : isDown ? "bg-destructive/10 border-destructive/30" : "bg-muted/30 border-border"

  return (
    <div
      className={`mt-2 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${tone} ${background}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{trend.label}</span>
    </div>
  )
}

function buildTrendLabel(current: number, previous: number): TrendLabel | undefined {
  if (!current && !previous) {
    return undefined
  }

  if (!previous) {
    if (!current) {
      return undefined
    }
    return { direction: "up", label: "Nouveau pic vs hier" }
  }

  const diff = current - previous
  if (diff === 0) {
    return { direction: "flat", label: "Stable vs hier" }
  }

  const percentage = Math.abs((diff / previous) * 100)
  const direction = diff > 0 ? "up" : "down"
  const formatted = `${diff > 0 ? "+" : "-"}${percentage.toFixed(1)}% vs hier`

  return { direction, label: formatted }
}

function formatLastSale(timestamp: string | null) {
  if (!timestamp) {
    return "Dernière vente non enregistrée aujourd'hui"
  }

  try {
    const formatter = new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })
    return `Dernière vente à ${formatter.format(new Date(timestamp))}`
  } catch {
    return "Dernière vente à confirmer"
  }
}

function buildSalesFooter(transactionCount: number, lastSaleAt: string | null) {
  const countLine = `Transactions : ${numberFormatter.format(transactionCount)}`
  if (!lastSaleAt) return countLine
  return `${countLine} · ${formatLastSale(lastSaleAt)}`
}

function QuickActionsCard({ role }: { role?: Database["public"]["Enums"]["user_role"] }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle>Actions rapides</CardTitle>
        <CardDescription>
          Accédez aux modules principaux {role === "restricted" ? "(lecture seule)" : "en quelques clics"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid flex-1 gap-3 sm:grid-cols-2">
        {quickLinks.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3 transition hover:border-primary hover:bg-primary/5"
          >
            <div>
              <p className="font-medium leading-tight">{action.title}</p>
              <p className="text-sm text-muted-foreground">{action.description}</p>
            </div>
            <action.icon className="h-5 w-5 text-muted-foreground transition group-hover:text-primary" />
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

function UpcomingActionsCard() {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle>Actions rapides</CardTitle>
        <CardDescription>Cette section sera activée dès que les modules seront disponibles.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
        Bientôt : accès direct aux ventes, stocks, fournisseurs et clients.
      </CardContent>
    </Card>
  )
}
