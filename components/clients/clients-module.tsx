"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  BadgeCheck,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  ShieldAlert,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription as SheetPanelDescription,
  SheetHeader as SheetPanelHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { mockClients, type Client } from "./mock-data"

const currencyFormatter = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
  minimumFractionDigits: 2,
})

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

type ClientFormState = {
  name: string
  phone: string
  city: string
  creditLimit: string
  balance: string
  lastPurchase: string
  status: Client["status"]
  notes: string
}

const emptyForm: ClientFormState = {
  name: "",
  phone: "",
  city: "",
  creditLimit: "0",
  balance: "0",
  lastPurchase: "",
  status: "ok",
  notes: "",
}

export function ClientsModule() {
  const [clients, setClients] = useState(mockClients)
  const [search, setSearch] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [profileClient, setProfileClient] = useState<Client | null>(null)

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return clients

    return clients.filter((client) =>
      [client.name, client.city, client.phone]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    )
  }, [search, clients])

  const handleSave = (data: ClientFormState, id?: string) => {
    const numericBalance = Number.parseFloat(data.balance) || 0
    const numericCredit = Number.parseFloat(data.creditLimit) || 0

    if (id) {
      setClients((prev) =>
        prev.map((client) =>
          client.id === id
            ? {
                ...client,
                name: data.name,
                phone: data.phone,
                city: data.city,
                creditLimit: numericCredit,
                balance: numericBalance,
                lastPurchase: data.lastPurchase || client.lastPurchase,
                status: data.status,
                notes: data.notes.trim(),
              }
            : client
        )
      )
      setEditClient(null)
    } else {
      setClients((prev) => [
        {
          id: `cli-${Date.now()}`,
          name: data.name,
          phone: data.phone,
          city: data.city,
          creditLimit: numericCredit,
          balance: numericBalance,
          lastPurchase: data.lastPurchase || "-",
          status: data.status,
          notes: data.notes.trim(),
        },
        ...prev,
      ])
    }

    setAddOpen(false)
  }

  const handleDelete = (id: string) => {
    setClients((prev) => prev.filter((client) => client.id !== id))
    if (profileClient?.id === id) setProfileClient(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="shadow-sm">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle>Suivi des encours</CardTitle>
              <CardDescription>Identifiez les clients proches de leur limite et priorisez vos relances (données démo).</CardDescription>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <div className="flex w-full items-center gap-2 rounded-md border border-input bg-card px-3 py-2 shadow-sm sm:w-[280px]">
                <Search className="size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher un client..."
                  className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <Button type="button" className="sm:self-auto" onClick={() => setAddOpen(true)}>
                <Plus className="size-4" />
                Ajouter un client
              </Button>
            </div>
          </div>

          <Badge variant="secondary" className="w-fit">
            Mode démonstration – données fictives
          </Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  <TableHead className="w-[220px]">Client</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead className="text-right">Plafond</TableHead>
                  <TableHead className="text-right">Encours</TableHead>
                  <TableHead>Dernier achat</TableHead>
                  <TableHead className="text-right">Statut</TableHead>
                  <TableHead className="w-[70px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      Aucun client ne correspond à votre recherche.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => {
                    const balanceTone = client.balance > client.creditLimit ? "text-destructive" : "text-foreground"

                    return (
                      <TableRow
                        key={client.id}
                        className="cursor-pointer text-sm hover:bg-muted/30"
                        onClick={() => setProfileClient(client)}
                      >
                        <TableCell className="text-base font-semibold text-foreground">{client.name}</TableCell>
                        <TableCell className="text-muted-foreground">{client.phone || "—"}</TableCell>
                        <TableCell className="text-right text-foreground">{formatCurrency(client.creditLimit)}</TableCell>
                        <TableCell className={cn("text-right font-semibold", balanceTone)}>{formatCurrency(client.balance)}</TableCell>
                        <TableCell className="text-muted-foreground">{client.lastPurchase || "—"}</TableCell>
                        <TableCell className="text-right">
                          <StatusPill status={client.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => setProfileClient(client)}>
                                Voir le profil
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditClient(client)
                                  setAddOpen(true)
                                }}
                              >
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(client.id)}>
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AddClientSheet
        open={addOpen || Boolean(editClient)}
        onOpenChange={(next) => {
          if (!next) {
            setAddOpen(false)
            setEditClient(null)
          } else {
            setAddOpen(true)
          }
        }}
        client={editClient}
        onSave={handleSave}
      />

      <ClientProfileSheet
        client={profileClient}
        onOpenChange={(open) => {
          if (!open) setProfileClient(null)
        }}
        onEdit={(client) => {
          setEditClient(client)
          setAddOpen(true)
        }}
        onDelete={(id) => handleDelete(id)}
      />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
    </div>
  )
}

type SheetBaseProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  title: string
  description?: string
}

function SheetBase({ open, onOpenChange, children, title, description }: SheetBaseProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetPanelHeader className="pb-0">
          <SheetTitle className="text-xl">{title}</SheetTitle>
          {description ? <SheetPanelDescription>{description}</SheetPanelDescription> : null}
        </SheetPanelHeader>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-6 pt-2">{children}</div>
      </SheetContent>
    </Sheet>
  )
}

function AddClientSheet({
  open,
  onOpenChange,
  client,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: Client | null
  onSave: (data: ClientFormState, id?: string) => void
}) {
  const [form, setForm] = useState<ClientFormState>(emptyForm)
  const isEdit = Boolean(client)

  useEffect(() => {
    if (open) {
      setForm(
        client
          ? {
              name: client.name,
              phone: client.phone,
              city: client.city,
              creditLimit: String(client.creditLimit ?? 0),
              balance: String(client.balance ?? 0),
              lastPurchase: client.lastPurchase ?? "",
              status: client.status,
              notes: client.notes ?? "",
            }
          : emptyForm
      )
    }
  }, [open, client])

  return (
    <SheetBase
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Modifier le client" : "Ajouter un client"}
      description="Feuille latérale inspirée du module Inventaire. Les actions sont en mode démo."
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          onSave(form, client?.id)
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom du client">
            <Input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Raison sociale"
              required
            />
          </Field>
          <Field label="Téléphone">
            <Input
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              placeholder="+212 ..."
            />
          </Field>
          <Field label="Ville">
            <Input
              value={form.city}
              onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
              placeholder="Casablanca"
            />
          </Field>
          <Field label="Plafond (MAD)">
            <Input
              type="number"
              step="0.01"
              value={form.creditLimit}
              onChange={(event) => setForm((prev) => ({ ...prev, creditLimit: event.target.value }))}
            />
          </Field>
          <Field label="Encours (MAD)">
            <Input
              type="number"
              step="0.01"
              value={form.balance}
              onChange={(event) => setForm((prev) => ({ ...prev, balance: event.target.value }))}
            />
          </Field>
          <Field label="Dernier achat">
            <Input
              value={form.lastPurchase}
              onChange={(event) => setForm((prev) => ({ ...prev, lastPurchase: event.target.value }))}
              placeholder="JJ/MM/AAAA"
            />
          </Field>
          <Field label="Statut">
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.status}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, status: event.target.value as Client["status"] }))
              }
            >
              <option value="ok">OK</option>
              <option value="risk">Surveille</option>
              <option value="blocked">Bloqué</option>
            </select>
          </Field>
        </div>

        <Field label="Notes internes">
          <Textarea
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Conditions de paiement, interlocuteur, préférences..."
            className="min-h-[120px]"
          />
        </Field>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit">{isEdit ? "Mettre à jour" : "Enregistrer"}</Button>
        </div>
      </form>
    </SheetBase>
  )
}

function ClientProfileSheet({
  client,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  client: Client | null
  onOpenChange: (open: boolean) => void
  onEdit: (client: Client) => void
  onDelete: (id: string) => void
}) {
  if (!client) return null

  const remainingCredit = client.creditLimit - client.balance

  return (
    <SheetBase
      open={Boolean(client)}
      onOpenChange={onOpenChange}
      title={client.name}
      description="Profil client – plafond, encours et informations principales."
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="size-4" />
              <span>{client.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              <span>{client.city}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">ID</span>
              <span className="font-mono">{client.id}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-sm">
              Plafond · {formatCurrency(client.creditLimit)}
            </Badge>
            <Badge variant={client.balance > client.creditLimit ? "destructive" : "secondary"} className="text-sm">
              Encours · {formatCurrency(client.balance)}
            </Badge>
            <StatusPill status={client.status} />
            <Button size="sm" variant="outline" onClick={() => onEdit(client)}>
              Modifier
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete(client.id)}>
              Supprimer
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ProfileStat
            label="Encours"
            value={formatCurrency(client.balance)}
            tone={client.balance > client.creditLimit ? "danger" : "neutral"}
          />
          <ProfileStat
            label="Crédit disponible"
            value={formatCurrency(Math.max(0, remainingCredit))}
            tone={remainingCredit > 0 ? "success" : "danger"}
          />
          <ProfileStat label="Plafond" value={formatCurrency(client.creditLimit)} />
          <ProfileStat label="Dernier achat" value={client.lastPurchase || "—"} />
        </div>

        {client.notes ? (
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-sm font-semibold text-foreground">Notes internes</p>
            <p className="text-sm text-muted-foreground">{client.notes}</p>
          </div>
        ) : null}

      </div>
    </SheetBase>
  )
}

function ProfileStat({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: string
  value: string
  icon?: ReactNode
  tone?: "success" | "danger" | "neutral"
}) {
  const toneClass = {
    success: "text-emerald-600",
    danger: "text-destructive",
    neutral: "text-muted-foreground",
  }[tone]

  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className={cn("text-sm font-semibold", toneClass)}>{value}</span>
    </div>
  )
}

function StatusPill({ status }: { status: Client["status"] }) {
  const tone =
    status === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "risk"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-destructive/30 bg-destructive/10 text-destructive"

  const label = status === "ok" ? "OK" : status === "risk" ? "Surveille" : "Bloqué"
  const Icon = status === "blocked" ? ShieldAlert : BadgeCheck

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold",
        tone
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </span>
  )
}
