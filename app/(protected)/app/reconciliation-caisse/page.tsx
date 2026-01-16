import type { ReconciliationDay } from "@/features/reconciliation/reconciliation-dashboard"
import type { ReconciliationHistoryItem } from "@/features/reconciliation/reconciliation-history-table"
import { ReconciliationPage } from "@/features/reconciliation/reconciliation-page"

export const metadata = {
  title: "Seraphine - Réconciliation caisse",
}

const reconciliationDays: ReconciliationDay[] = [
  {
    id: "day-2025-12-12",
    date: "2025-12-12",
    opening: 1200,
    openingLocked: true,
    sales: 8600,
    withdrawals: 150,
    adjustments: 0,
    actual: 9300,
    isLocked: false,
  },
  {
    id: "day-2025-12-11",
    date: "2025-12-11",
    opening: 1000,
    openingLocked: true,
    sales: 8500,
    withdrawals: 100,
    adjustments: 0,
    actual: 9550,
    isLocked: true,
  },
  {
    id: "day-2025-12-10",
    date: "2025-12-10",
    opening: 1000,
    openingLocked: true,
    sales: 8850.5,
    withdrawals: 0,
    adjustments: 0,
    actual: 9850.5,
    isLocked: true,
  },
]

const reconciliationHistory: ReconciliationHistoryItem[] = [
  {
    id: "rc-2407-001",
    date: "2025-12-12",
    opening: 1200,
    expected: 9650,
    counted: 9300,
  },
  {
    id: "rc-2407-002",
    date: "2025-12-11",
    opening: 1000,
    expected: 9400,
    counted: 9550,
  },
  {
    id: "rc-2407-003",
    date: "2025-12-10",
    opening: 1000,
    expected: 9850.5,
    counted: 9850.5,
  },
  {
    id: "rc-2407-004",
    date: "2025-12-09",
    opening: 900,
    expected: 10200,
    counted: 9800,
  },
  {
    id: "rc-2407-005",
    date: "2025-12-08",
    opening: 1000,
    expected: 8800,
    counted: 8800,
  },
  {
    id: "rc-2407-006",
    date: "2025-12-07",
    opening: 1100,
    expected: 9100,
    counted: 9480,
  },
]

export default function Page() {
  return <ReconciliationPage days={reconciliationDays} history={reconciliationHistory} />
}
