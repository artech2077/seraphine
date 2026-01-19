"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { ContentCard } from "@/components/layout/content-card"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useRoleAccess } from "@/lib/auth/use-role-access"
import { toast } from "sonner"

export type ReconciliationDay = {
  id: string
  date: string
  opening: number | null
  openingLocked: boolean
  sales: number
  withdrawals: number
  adjustments: number
  actual: number | null
  isLocked: boolean
}

type ResultState = "deficit" | "surplus" | "valid"

const currencyFormatter = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
})

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

function parseAmount(value: string) {
  const normalized = value.replace(/\s/g, "").replace(",", ".")
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function formatDayKey(value: Date) {
  return format(value, "yyyy-MM-dd")
}

export function ReconciliationDashboard({
  days,
  onUpdateDay,
  isLoading = false,
}: {
  days: ReconciliationDay[]
  onUpdateDay?: (day: ReconciliationDay) => void | Promise<void>
  isLoading?: boolean
}) {
  const { canManage } = useRoleAccess()
  const canManageReconciliation = canManage("reconciliation")
  const [records, setRecords] = React.useState(days)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(() => {
    if (!days.length) return undefined
    return new Date(days[0].date)
  })
  const [openingInput, setOpeningInput] = React.useState("")
  const [closingInput, setClosingInput] = React.useState("")

  React.useEffect(() => {
    setRecords(days)
  }, [days])

  const availableDays = React.useMemo(() => new Set(records.map((day) => day.date)), [records])

  const selectedDay = React.useMemo(() => {
    if (!records.length) return null
    if (!selectedDate) return records[0]
    const dayKey = formatDayKey(selectedDate)
    return records.find((day) => day.date === dayKey) ?? records[0]
  }, [records, selectedDate])

  React.useEffect(() => {
    if (!records.length) return
    const dayKey = selectedDate ? formatDayKey(selectedDate) : null
    if (!dayKey || !availableDays.has(dayKey)) {
      setSelectedDate(new Date(records[0].date))
    }
  }, [availableDays, records, selectedDate])

  React.useEffect(() => {
    if (!selectedDay) return
    setOpeningInput(typeof selectedDay.opening === "number" ? String(selectedDay.opening) : "")
    setClosingInput(typeof selectedDay.actual === "number" ? String(selectedDay.actual) : "")
  }, [selectedDay])

  const expectedTotal = selectedDay
    ? (selectedDay.opening ?? 0) +
      selectedDay.sales -
      selectedDay.withdrawals +
      selectedDay.adjustments
    : 0

  const rawDifference = selectedDay ? (selectedDay.actual ?? expectedTotal) - expectedTotal : 0
  const roundedDifference = Number(rawDifference.toFixed(2))

  const resultState: ResultState =
    roundedDifference === 0 ? "valid" : roundedDifference < 0 ? "deficit" : "surplus"

  const resultConfig: Record<
    ResultState,
    { label: string; message: string; className: string; textClassName: string }
  > = {
    deficit: {
      label: "Écart",
      message: "Le montant de la caisse est inférieur au montant attendu",
      className: "border-destructive/30 bg-destructive/10",
      textClassName: "text-destructive",
    },
    surplus: {
      label: "Excédent",
      message: "Le montant de la caisse est supérieur au montant attendu",
      className: "border-warning/30 bg-warning/10",
      textClassName: "text-warning",
    },
    valid: {
      label: "Validé",
      message: "Le montant de la caisse correspond au montant attendu",
      className: "border-primary/30 bg-primary/10",
      textClassName: "text-primary",
    },
  }

  const result = resultConfig[resultState]

  if (!isLoading && records.length === 0) {
    return (
      <ContentCard contentClassName="py-6">
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>Aucune journée de caisse</EmptyTitle>
            <EmptyDescription>
              Les journées apparaîtront après la première ouverture ou activité en caisse.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </ContentCard>
    )
  }

  function handleConfirmOpening() {
    if (!selectedDay) return
    const parsed = parseAmount(openingInput)
    if (parsed === null) return

    setRecords((previous) =>
      previous.map((day) =>
        day.id === selectedDay.id ? { ...day, opening: parsed, openingLocked: true } : day
      )
    )
    void Promise.resolve(onUpdateDay?.({ ...selectedDay, opening: parsed, openingLocked: true }))
      .then(() => toast.success("Ouverture enregistrée."))
      .catch(() => toast.error("Impossible d'enregistrer l'ouverture."))
  }

  function handleConfirmClosing() {
    if (!selectedDay) return
    const parsed = parseAmount(closingInput)
    if (parsed === null) return

    setRecords((previous) =>
      previous.map((day) =>
        day.id === selectedDay.id ? { ...day, actual: parsed, isLocked: true } : day
      )
    )
    void Promise.resolve(onUpdateDay?.({ ...selectedDay, actual: parsed, isLocked: true }))
      .then(() => toast.success("Fermeture enregistrée."))
      .catch(() => toast.error("Impossible d'enregistrer la fermeture."))
  }

  const isOpeningLocked =
    selectedDay?.openingLocked || selectedDay?.isLocked || !canManageReconciliation
  const isClosingLocked = selectedDay?.isLocked || !canManageReconciliation

  const dateLabel = selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Sélectionner"

  return (
    <ContentCard contentClassName="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger
            className={cn(
              buttonVariants({ variant: "outline" }),
              "bg-popover text-muted-foreground h-9 w-fit justify-between gap-2 rounded-md border-input px-3 text-left font-normal",
              selectedDate && "text-foreground"
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <CalendarIcon className="text-muted-foreground size-4" />
              <span className="min-w-0 truncate">{dateLabel}</span>
            </span>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => !availableDays.has(formatDayKey(date))}
            />
          </PopoverContent>
        </Popover>
        {selectedDay?.isLocked ? <Badge variant="secondary">Journée verrouillée</Badge> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ouverture de caisse</CardTitle>
            <CardDescription>Saisir le montant du fond de caisse</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                placeholder="Montant"
                value={openingInput}
                onChange={(event) => setOpeningInput(event.target.value)}
                inputMode="decimal"
                disabled={Boolean(isOpeningLocked)}
              />
              <Button
                onClick={handleConfirmOpening}
                className="sm:shrink-0"
                disabled={Boolean(isOpeningLocked)}
              >
                Confirmer l&apos;ouverture
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fermeture de caisse</CardTitle>
            <CardDescription>Saisir le total physique en caisse</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                placeholder="Montant"
                value={closingInput}
                onChange={(event) => setClosingInput(event.target.value)}
                inputMode="decimal"
                disabled={Boolean(isClosingLocked)}
              />
              <Button
                onClick={handleConfirmClosing}
                className="sm:shrink-0"
                disabled={Boolean(isClosingLocked)}
              >
                Confirmer la clôture
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total attendu en caisse</CardTitle>
            <CardDescription>Ouverture + Ventes + Sorties + Ajustement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-semibold">{formatCurrency(expectedTotal)}</div>
              <p className="text-muted-foreground text-sm">
                Ouverture {formatCurrency(selectedDay?.opening ?? 0)} · Ventes{" "}
                {formatCurrency(selectedDay?.sales ?? 0)} · Sorties{" "}
                {formatCurrency(selectedDay?.withdrawals ?? 0)} · Ajustement{" "}
                {formatCurrency(selectedDay?.adjustments ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className={cn("border", result.className)}>
          <CardHeader className="pb-2">
            <CardTitle className={cn("text-base", result.textClassName)}>{result.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className={cn("text-2xl font-semibold", result.textClassName)}>
                {formatCurrency(roundedDifference)}
              </div>
              <p className={cn("text-sm", result.textClassName)}>{result.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ContentCard>
  )
}
