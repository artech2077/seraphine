import { createSupabaseServerClient } from "@/lib/supabase/server"

const DASHBOARD_TIMEZONE = "Africa/Casablanca"

type SalesSummary = {
  total: number
  transactionCount: number
  previousTotal: number
  lastSaleAt: string | null
}

type StockAlertItem = {
  id: string
  name: string
  stock: number
  lowStockThreshold: number
  supplierName: string | null
}

type StockAlertSnapshot = {
  total: number
  items: StockAlertItem[]
}

type ForecastSummary = {
  movingAverage: number
  latestTotal: number
  windowDays: number
}

export type DashboardMetrics = {
  sales: SalesSummary
  stockAlerts: StockAlertSnapshot
  forecast: ForecastSummary
}

const defaultSalesSummary: SalesSummary = {
  total: 0,
  transactionCount: 0,
  previousTotal: 0,
  lastSaleAt: null,
}

const defaultStockAlerts: StockAlertSnapshot = {
  total: 0,
  items: [],
}

const defaultForecast: ForecastSummary = {
  movingAverage: 0,
  latestTotal: 0,
  windowDays: 7,
}

async function getSalesSummary(pharmacyId: string): Promise<SalesSummary> {
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase.rpc<
      Array<{
        total: number | null
        transaction_count: number | null
        previous_total: number | null
        last_sale: string | null
      }>
    >("get_sales_summary", {
      p_pharmacy_id: pharmacyId,
      p_timezone: DASHBOARD_TIMEZONE,
    })

    if (error) {
      throw error
    }

    const row = data?.[0]

    return {
      total: Number(row?.total ?? 0),
      transactionCount: Number(row?.transaction_count ?? 0),
      previousTotal: Number(row?.previous_total ?? 0),
      lastSaleAt: row?.last_sale ?? null,
    }
}

async function getStockAlerts(pharmacyId: string, limit = 6): Promise<StockAlertSnapshot> {
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase.rpc<
      Array<{
        alert_count: number | null
        items: Array<{
          id: string
          name: string
          stock: number
          low_stock_threshold: number
          supplier_name: string | null
        }> | null
      }>
    >("get_stock_alert_snapshot", {
      p_pharmacy_id: pharmacyId,
      p_limit: limit,
    })

    if (error) {
      throw error
    }

    const snapshot = data?.[0]
    const items = Array.isArray(snapshot?.items) ? snapshot?.items : []

    return {
      total: Number(snapshot?.alert_count ?? 0),
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        stock: Number(item.stock ?? 0),
        lowStockThreshold: Number(item.low_stock_threshold ?? 0),
        supplierName: item.supplier_name ?? null,
      })),
    }
}

async function getForecastSummary(pharmacyId: string): Promise<ForecastSummary> {
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase.rpc<
      Array<{
        moving_average: number | null
        last_day_total: number | null
        window_days: number | null
      }>
    >("get_sales_forecast", {
      p_pharmacy_id: pharmacyId,
      p_timezone: DASHBOARD_TIMEZONE,
      p_window: 7,
    })

    if (error) {
      throw error
    }

    const row = data?.[0]

    return {
      movingAverage: Number(row?.moving_average ?? 0),
      latestTotal: Number(row?.last_day_total ?? 0),
      windowDays: Number(row?.window_days ?? 7),
    }
}

export async function getDashboardMetrics(pharmacyId: string): Promise<DashboardMetrics> {
  if (!pharmacyId) {
    throw new Error("pharmacyId is required to build dashboard metrics")
  }

  const [sales, stockAlerts, forecast] = await Promise.all([
    getSalesSummary(pharmacyId).catch((error) => {
      console.error("Failed to load sales summary", error)
      return defaultSalesSummary
    }),
    getStockAlerts(pharmacyId).catch((error) => {
      console.error("Failed to load stock alerts", error)
      return defaultStockAlerts
    }),
    getForecastSummary(pharmacyId).catch((error) => {
      console.error("Failed to load forecast summary", error)
      return defaultForecast
    }),
  ])

  return { sales, stockAlerts, forecast }
}
