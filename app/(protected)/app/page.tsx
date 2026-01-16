import { DashboardPage, type DashboardData } from "@/features/dashboard/dashboard-page"

export const metadata = {
  title: "Seraphine - Tableau de bord",
}

const dashboardData: DashboardData = {
  sales: {
    revenue: 10250,
    transactions: 150,
    trend: 12,
  },
  cash: {
    status: "Ouverte",
    floatAmount: 5000,
  },
  stockAlerts: {
    total: 7,
    ruptures: 2,
    lowStock: 5,
  },
  orders: {
    pending: 8,
    delivered: 3,
  },
  trendData: {
    "7J": [
      { date: "01 Oct", revenue: 8200 },
      { date: "02 Oct", revenue: 9100 },
      { date: "03 Oct", revenue: 9800 },
      { date: "04 Oct", revenue: 9200 },
      { date: "05 Oct", revenue: 10150 },
      { date: "06 Oct", revenue: 11100 },
      { date: "07 Oct", revenue: 10850 },
    ],
    "30J": [
      { date: "01 Sep", revenue: 7800 },
      { date: "05 Sep", revenue: 8600 },
      { date: "10 Sep", revenue: 9400 },
      { date: "15 Sep", revenue: 8800 },
      { date: "20 Sep", revenue: 10400 },
      { date: "25 Sep", revenue: 9900 },
      { date: "30 Sep", revenue: 11250 },
    ],
    TRIM: [
      { date: "S1", revenue: 71200 },
      { date: "S4", revenue: 68900 },
      { date: "S8", revenue: 75100 },
      { date: "S12", revenue: 72800 },
    ],
  },
  stockItems: [
    { id: "ST-001", name: "Paracetamol 500mg", threshold: 12, stock: 8 },
    { id: "ST-002", name: "Ibuprofene 400mg", threshold: 20, stock: 14 },
    { id: "ST-003", name: "Gants nitrile", threshold: 15, stock: 0 },
    { id: "ST-004", name: "Vitamine C 1000", threshold: 10, stock: 9 },
    { id: "ST-005", name: "Sérum physiologique", threshold: 18, stock: 22 },
  ],
  recentSales: [
    { id: "VT-2407-092", time: "17:40", amount: 150.0, client: "John Doe", payment: "Carte" },
    { id: "VT-2407-091", time: "13:30", amount: 89.5, client: "Amina R.", payment: "Crédit" },
    { id: "VT-2407-090", time: "12:34", amount: 215.0, client: "Cabinet Atlas", payment: "Cash" },
    { id: "VT-2407-089", time: "11:52", amount: 64.0, client: "Sara B.", payment: "Cash" },
    {
      id: "VT-2407-088",
      time: "09:54",
      amount: 132.0,
      client: "Clinique Horizon",
      payment: "Carte",
    },
  ],
  recentOrders: [
    {
      id: "PO-4501",
      supplier: "Pharma-Distrib Hohejdwcs",
      createdAt: "12/12/2025",
      total: 12500,
      status: "En cours",
    },
    {
      id: "PO-4500",
      supplier: "Med-Supply",
      createdAt: "12/12/2025",
      total: 12500,
      status: "Livré",
    },
    {
      id: "PO-4499",
      supplier: "Med-Supply",
      createdAt: "12/12/2025",
      total: 12500,
      status: "Livré",
    },
    {
      id: "PO-4498",
      supplier: "Santé Pro",
      createdAt: "12/12/2025",
      total: 12500,
      status: "En cours",
    },
    {
      id: "PO-4497",
      supplier: "Pharma-Distrib",
      createdAt: "12/12/2025",
      total: 12500,
      status: "Livré",
    },
  ],
}

export default function Page() {
  return <DashboardPage data={dashboardData} />
}
