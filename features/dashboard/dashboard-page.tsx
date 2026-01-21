"use client"

import * as React from "react"
import {
  AlertTriangle,
  ArrowUpRight,
  ClipboardList,
  Maximize2,
  PackageCheck,
  ShoppingCart,
  Truck,
  Wallet,
} from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import type { DateRange } from "react-day-picker"

import { PageShell } from "@/components/layout/page-shell"
import { ContentCard } from "@/components/layout/content-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DatePickerField } from "@/components/forms/date-picker-field"

export type TrendRange = "7J" | "30J" | "TRIM"

export type SalesTrendPoint = {
  date: string
  isoDate?: string
  revenue: number
}

export type DashboardData = {
  sales: {
    revenue: number
    transactions: number
    trend: number
  }
  cash: {
    status: "Ouverte" | "Fermée"
    floatAmount: number
  }
  stockAlerts: {
    total: number
    ruptures: number
    lowStock: number
  }
  orders: {
    pending: number
    delivered: number
  }
  trendData: Record<TrendRange, SalesTrendPoint[]>
  stockItems: Array<{
    id: string
    name: string
    threshold: number
    stock: number
  }>
  recentSales: Array<{
    id: string
    date: string
    time: string
    amount: number
    client: string
    payment: "Carte" | "Cash" | "Crédit"
  }>
  recentOrders: Array<{
    id: string
    supplier: string
    createdAt: string
    date?: string
    total: number
    status: "En cours" | "Livré"
  }>
}

const currencyFormatter = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
  maximumFractionDigits: 0,
})

const amountFormatter = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
})

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

function formatAmount(value: number) {
  return amountFormatter.format(value)
}

function formatPercentage(value: number) {
  const formatted = new Intl.NumberFormat("fr-FR", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value / 100)
  return formatted
}

function isWithinRange(dateValue: string | undefined, range?: DateRange) {
  if (!dateValue || !range?.from) return true
  const dateOnlyMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const parsed = dateOnlyMatch
    ? new Date(
        Number.parseInt(dateOnlyMatch[1], 10),
        Number.parseInt(dateOnlyMatch[2], 10) - 1,
        Number.parseInt(dateOnlyMatch[3], 10)
      )
    : new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) return true
  if (parsed < range.from) return false
  if (!range.to) return true
  const endOfDay = new Date(range.to)
  endOfDay.setHours(23, 59, 59, 999)
  return parsed <= endOfDay
}

function getStockVariant(stock: number, threshold: number) {
  if (stock === 0) return "destructive"
  if (stock <= threshold) return "warning"
  return "success"
}

function getPaymentVariant(payment: DashboardData["recentSales"][number]["payment"]) {
  switch (payment) {
    case "Carte":
      return "secondary"
    case "Crédit":
      return "outline"
    case "Cash":
    default:
      return "success"
  }
}

function getOrderVariant(status: DashboardData["recentOrders"][number]["status"]) {
  return status === "Livré" ? "success" : "outline"
}

export function DashboardPage({
  data,
  isLoading = false,
}: {
  data: DashboardData
  isLoading?: boolean
}) {
  const [range, setRange] = React.useState<TrendRange>("30J")
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()

  const trendData = React.useMemo(() => {
    const points = data.trendData[range]
    if (!dateRange?.from) return points
    return points.filter((point) => isWithinRange(point.isoDate, dateRange))
  }, [data.trendData, dateRange, range])

  const recentSales = React.useMemo(() => {
    if (!dateRange?.from) return data.recentSales
    return data.recentSales.filter((sale) => isWithinRange(sale.date, dateRange))
  }, [data.recentSales, dateRange])

  const recentOrders = React.useMemo(() => {
    if (!dateRange?.from) return data.recentOrders
    return data.recentOrders.filter((order) =>
      isWithinRange(order.date ?? order.createdAt, dateRange)
    )
  }, [data.recentOrders, dateRange])

  const showTrendEmpty = !isLoading && trendData.length === 0
  const showStockEmpty = !isLoading && data.stockItems.length === 0
  const showSalesEmpty = !isLoading && recentSales.length === 0
  const showOrdersEmpty = !isLoading && recentOrders.length === 0

  return (
    <PageShell
      title="Tableau de bord"
      description="Suivez vos indicateurs clés et l'activité récente."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <ButtonGroup>
            <Button size="sm" nativeButton={false} render={<a href="/app/achats" />}>
              <Truck />
              Livraison
            </Button>
            <Button
              size="sm"
              variant="secondary"
              nativeButton={false}
              render={<a href="/app/achats" />}
            >
              <ClipboardList />
              Commande
            </Button>
            <Button size="sm" nativeButton={false} render={<a href="/app/ventes" />}>
              <ShoppingCart />
              Nouvelle vente
            </Button>
          </ButtonGroup>
          <DatePickerField placeholder="Date" value={dateRange} onChange={setDateRange} />
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <div className="space-y-1">
                <CardTitle className="text-sm">Ventes du jour</CardTitle>
                <CardDescription>Chiffre d&apos;affaires & transactions</CardDescription>
              </div>
              <CardAction>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  nativeButton={false}
                  render={<a href="/app/ventes" />}
                >
                  <ArrowUpRight />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-semibold">{formatCurrency(data.sales.revenue)}</div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">{data.sales.transactions} ventes</span>
                <Badge variant="success">{formatPercentage(data.sales.trend)} vs hier</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="space-y-1">
                <CardTitle className="text-sm">Statut caisse</CardTitle>
                <CardDescription>Etat & fond de roulement</CardDescription>
              </div>
              <CardAction>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  nativeButton={false}
                  render={<a href="/app/reconciliation-caisse" />}
                >
                  <Wallet />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-semibold">{data.cash.status}</span>
                <Badge variant={data.cash.status === "Ouverte" ? "success" : "secondary"}>
                  {data.cash.status}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                Fond de roulement: {formatAmount(data.cash.floatAmount)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="space-y-1">
                <CardTitle className="text-sm">Alertes stock</CardTitle>
                <CardDescription>Produits en tension</CardDescription>
              </div>
              <CardAction>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  nativeButton={false}
                  render={<a href="/app/inventaire" />}
                >
                  <AlertTriangle />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-semibold">{data.stockAlerts.total} produits</div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="destructive">{data.stockAlerts.ruptures} ruptures</Badge>
                <Badge variant="warning">{data.stockAlerts.lowStock} stock bas</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="space-y-1">
                <CardTitle className="text-sm">Commandes</CardTitle>
                <CardDescription>Flux achats & livraisons</CardDescription>
              </div>
              <CardAction>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  nativeButton={false}
                  render={<a href="/app/achats" />}
                >
                  <PackageCheck />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Livraisons en attente</span>
                <span className="font-medium">{data.orders.pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Commandes livrées</span>
                <span className="font-medium">{data.orders.delivered}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <ContentCard
          title="Analyse des Tendances de Vente"
          description="Evolution du chiffre d'affaires selon la période sélectionnée."
          actions={
            <div className="flex items-center gap-2">
              <ToggleGroup
                value={[range]}
                onValueChange={(value) => {
                  const nextValue = value[0] as TrendRange | undefined
                  if (nextValue) setRange(nextValue)
                }}
              >
                <ToggleGroupItem value="7J">7J</ToggleGroupItem>
                <ToggleGroupItem value="30J">30J</ToggleGroupItem>
                <ToggleGroupItem value="TRIM">TRIM</ToggleGroupItem>
              </ToggleGroup>
              <Button variant="ghost" size="icon-sm" aria-label="Agrandir">
                <Maximize2 />
              </Button>
            </div>
          }
        >
          <div className="h-72 w-full">
            {showTrendEmpty ? (
              <Empty className="border border-dashed h-full">
                <EmptyHeader>
                  <EmptyTitle>Aucune tendance disponible</EmptyTitle>
                  <EmptyDescription>
                    Les ventes apparaîtront ici dès qu&apos;une période contient des transactions.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ChartContainer
                className="h-full w-full"
                config={{
                  revenue: {
                    label: "Chiffre d'affaires",
                    color: "var(--chart-2)",
                  },
                }}
              >
                <LineChart data={trendData} margin={{ left: 8, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCurrency(Number(value))}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-revenue)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </div>
        </ContentCard>

        <div className="grid gap-4 lg:grid-cols-2">
          <ContentCard
            title="Alertes produits"
            description="Produits sous leur seuil d'alerte."
            actions={
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<a href="/app/inventaire" />}
              >
                Voir l&apos;inventaire
              </Button>
            }
          >
            {showStockEmpty ? (
              <Empty className="border border-dashed">
                <EmptyHeader>
                  <EmptyTitle>Aucune alerte stock</EmptyTitle>
                  <EmptyDescription>
                    Les alertes apparaîtront quand un produit passe sous son seuil.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Seuil</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.stockItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.threshold}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getStockVariant(item.stock, item.threshold)}>
                          {item.stock}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ContentCard>

          <ContentCard
            title="Ventes récentes"
            description="Dernières transactions en caisse."
            actions={
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<a href="/app/ventes" />}
              >
                Voir toutes les ventes
              </Button>
            }
          >
            {showSalesEmpty ? (
              <Empty className="border border-dashed">
                <EmptyHeader>
                  <EmptyTitle>Aucune vente récente</EmptyTitle>
                  <EmptyDescription>
                    Les transactions apparaîtront ici après les premiers passages en caisse.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ventes</TableHead>
                    <TableHead>Heure</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead className="text-right">Paiement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.id}</TableCell>
                      <TableCell>{sale.time}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{formatAmount(sale.amount)}</span>
                          <span className="text-muted-foreground text-xs">{sale.client}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getPaymentVariant(sale.payment)}>{sale.payment}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ContentCard>
        </div>

        <ContentCard
          title="Dernières commandes"
          description="Suivi des derniers bons de commande et livraisons."
          actions={
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<a href="/app/achats" />}
            >
              Voir les achats
            </Button>
          }
        >
          {showOrdersEmpty ? (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyTitle>Aucune commande récente</EmptyTitle>
                <EmptyDescription>
                  Les bons de commande et livraisons apparaîtront ici après leur création.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Date de création</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.supplier}</TableCell>
                    <TableCell>{order.createdAt}</TableCell>
                    <TableCell>{formatAmount(order.total)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={getOrderVariant(order.status)}>{order.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ContentCard>
      </div>
    </PageShell>
  )
}
