import { AlertTriangle, Calendar, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type ReconciliationStatus = "ecart" | "valide" | "excedent"

type HistoryRow = {
  date: string
  opening: number
  expected: number
  counted: number
  variance: number
  status: ReconciliationStatus
}

const madFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const endOfDay = {
  expected: 9850.5,
  counted: 9835,
}

const reconciliationHistory: HistoryRow[] = [
  {
    date: "14/05/2024",
    opening: 1000,
    expected: 9850.5,
    counted: 9835,
    variance: -15.5,
    status: "ecart",
  },
  {
    date: "13/05/2024",
    opening: 1000,
    expected: 12430,
    counted: 12430,
    variance: 0,
    status: "valide",
  },
  {
    date: "12/05/2024",
    opening: 1000,
    expected: 8765.2,
    counted: 8770,
    variance: 4.8,
    status: "excedent",
  },
  {
    date: "11/05/2024",
    opening: 1000,
    expected: 11200,
    counted: 11200,
    variance: 0,
    status: "valide",
  },
]

const statusMap: Record<
  ReconciliationStatus,
  {
    label: string
    badgeVariant: "default" | "success" | "warning" | "destructive" | "outline"
  }
> = {
  ecart: { label: "Écart", badgeVariant: "destructive" },
  valide: { label: "Validé", badgeVariant: "default" },
  excedent: { label: "Excédent", badgeVariant: "warning" },
}

function formatMad(value: number) {
  return `${madFormatter.format(value).replace(/\u00a0/g, " ")} MAD`
}

function formatNumber(value: number) {
  return madFormatter.format(value).replace(/\u00a0/g, " ")
}

export function MorningFloatCard() {
  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-5 p-6">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            FOND DE CAISSE MATINAL
          </div>
          <div className="mt-1 text-base font-semibold text-foreground">
            Saisir le montant du fond de caisse d&apos;ouverture
          </div>
        </div>

        <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex items-center rounded-lg border border-input bg-card shadow-xs">
            <Input
              defaultValue="1000,00"
              inputMode="decimal"
              aria-label="Montant du fond de caisse"
              className="h-11 border-0 bg-transparent px-3 shadow-none focus-visible:border-transparent focus-visible:ring-0"
              placeholder="0,00"
            />
            <div className="flex h-11 items-center border-l border-border/70 px-3 text-sm font-semibold text-muted-foreground">
              MAD
            </div>
          </div>
          <Button className="h-11 px-5">Confirmer l&apos;ouverture</Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function EndOfDayReconciliationCard() {
  const variance = endOfDay.counted - endOfDay.expected

  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              RÉCONCILIATION FIN DE JOURNÉE
            </div>
            <div className="mt-1 text-base font-semibold text-foreground">
              Vérifier et clôturer la caisse pour la journée.
            </div>
          </div>
          <Button className="h-10 px-4">Clôturer la caisse</Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-lg border border-border bg-muted/40 p-4 shadow-xs">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Total attendu en caisse
            </p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{formatMad(endOfDay.expected)}</p>
            <p className="mt-2 text-xs text-muted-foreground">Ouverture + Ventes - Sorties + Ajustements</p>
          </div>

          <div className="space-y-2 rounded-lg border border-border bg-card p-4 shadow-xs">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Montant réel compté
            </p>
            <div className="flex items-center rounded-lg border border-input bg-card shadow-xs">
              <Input
                defaultValue={formatNumber(endOfDay.counted)}
                inputMode="decimal"
                aria-label="Montant réellement compté"
                className="h-11 border-0 bg-transparent px-3 shadow-none focus-visible:border-transparent focus-visible:ring-0"
                placeholder="0,00"
              />
              <div className="flex h-11 items-center border-l border-border/70 px-3 text-sm font-semibold text-muted-foreground">
                MAD
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Saisir le total physique en caisse.</p>
          </div>

          <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 shadow-xs">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.08em]">Écart constaté</p>
            </div>
            <p className="text-2xl font-semibold text-destructive">
              {variance > 0 ? "+" : ""}
              {formatMad(Math.abs(variance))}
            </p>
            <p className="text-xs text-destructive/80">Un écart a été détecté. Un rapport sera généré.</p>
          </div>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>Attendu</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />
            <span>Compté</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-destructive" />
            <span>Écart</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ReconciliationHistoryTable() {
  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Historique des Réconciliations
            </div>
            <div className="mt-1 text-base font-semibold text-foreground">
              Suivez les clôtures précédentes.
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              className="h-10 rounded-md bg-input pl-9"
              aria-label="Rechercher une réconciliation"
            />
          </div>
          <div className="relative w-full md:w-52">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              className="h-10 rounded-md bg-input pl-9 pr-3"
              aria-label="Filtrer par date"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow className="border-border">
                <TableHead className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Date
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Ouverture
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Attendu
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Compté
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Écart
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Statut
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reconciliationHistory.map((row) => {
                const status = statusMap[row.status]
                const isPositive = row.variance > 0
                const isNegative = row.variance < 0
                const varianceClass = cn("font-semibold", {
                  "text-destructive": isNegative,
                  "text-primary": isPositive,
                  "text-foreground": !isNegative && !isPositive,
                })

                return (
                  <TableRow key={`${row.date}-${row.status}`} className="border-border">
                    <TableCell className="font-semibold text-foreground">{row.date}</TableCell>
                    <TableCell className="text-foreground">{formatNumber(row.opening)}</TableCell>
                    <TableCell className="text-foreground">{formatNumber(row.expected)}</TableCell>
                    <TableCell className="text-foreground">{formatNumber(row.counted)}</TableCell>
                    <TableCell className={varianceClass}>
                      {row.variance > 0 ? "+" : ""}
                      {formatNumber(Math.abs(row.variance))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.badgeVariant}>{status.label}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
