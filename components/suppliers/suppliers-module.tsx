"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  CreditCard,
  FileText,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Truck,
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

import { mockSuppliers, type Supplier } from "./mock-data"

const currencyFormatter = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
  minimumFractionDigits: 2,
})

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

type SupplierFormState = {
  name: string
  email: string
  phone: string
  city: string
  balance: string
  notes: string
}

const emptyForm: SupplierFormState = {
  name: "",
  email: "",
  phone: "",
  city: "",
  balance: "0",
  notes: "",
}

export function SuppliersModule() {
  const [suppliers, setSuppliers] = useState(mockSuppliers)
  const [search, setSearch] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [profileSupplier, setProfileSupplier] = useState<Supplier | null>(null)

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return suppliers

    return suppliers.filter((supplier) =>
      [supplier.name, supplier.email, supplier.city, supplier.phone]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    )
  }, [search, suppliers])

  const handleSave = (data: SupplierFormState, id?: string) => {
    const numericBalance = Number.parseFloat(data.balance) || 0

    if (id) {
      setSuppliers((prev) =>
        prev.map((supplier) =>
          supplier.id === id
            ? {
                ...supplier,
                name: data.name,
                email: data.email,
                phone: data.phone,
                city: data.city,
                balance: numericBalance,
                notes: data.notes.trim(),
              }
            : supplier
        )
      )
      setEditSupplier(null)
    } else {
      setSuppliers((prev) => [
        {
          id: `sup-${Date.now()}`,
          name: data.name,
          email: data.email,
          phone: data.phone,
          city: data.city,
          balance: numericBalance,
          deliveries: [],
          purchaseOrders: [],
          payments: [],
          notes: data.notes.trim(),
        },
        ...prev,
      ])
    }

    setAddOpen(false)
  }

  const handleDelete = (id: string) => {
    setSuppliers((prev) => prev.filter((supplier) => supplier.id !== id))
    if (profileSupplier?.id === id) {
      setProfileSupplier(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="shadow-sm">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle>Liste des Fournisseurs</CardTitle>
              <CardDescription>Données fictives pour valider l’UI et les interactions.</CardDescription>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <div className="flex w-full items-center gap-2 rounded-md border border-input bg-card px-3 py-2 shadow-sm sm:w-[280px]">
                <Search className="size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher..."
                  className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <Button type="button" className="sm:self-auto" onClick={() => setAddOpen(true)}>
                <Plus className="size-4" />
                Ajouter un fournisseur
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
                  <TableHead className="w-[200px]">Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="w-[70px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      Aucun fournisseur ne correspond à votre recherche.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <TableRow
                      key={supplier.id}
                      className="cursor-pointer text-sm hover:bg-muted/30"
                      onClick={() => setProfileSupplier(supplier)}
                    >
                      <TableCell className="text-base font-semibold text-foreground">{supplier.name}</TableCell>
                      <TableCell className="text-muted-foreground">{supplier.email}</TableCell>
                      <TableCell className="text-muted-foreground">{supplier.phone}</TableCell>
                      <TableCell className="text-muted-foreground">{supplier.city}</TableCell>
                      <TableCell className="text-right font-semibold">
                        <span className={cn(supplier.balance < 0 ? "text-destructive" : "text-emerald-600")}>{formatCurrency(supplier.balance)}</span>
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
                            <DropdownMenuItem
                              onClick={() => {
                                setProfileSupplier(supplier)
                              }}
                            >
                              Voir le profil
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditSupplier(supplier)
                                setAddOpen(true)
                              }}
                            >
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(supplier.id)}>
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AddSupplierSheet
        open={addOpen || Boolean(editSupplier)}
        onOpenChange={(next) => {
          if (!next) {
            setAddOpen(false)
            setEditSupplier(null)
          } else {
            setAddOpen(true)
          }
        }}
        supplier={editSupplier}
        onSave={handleSave}
      />

      <SupplierProfileSheet
        supplier={profileSupplier}
        onOpenChange={(open) => {
          if (!open) setProfileSupplier(null)
        }}
        onEdit={(supplier) => {
          setEditSupplier(supplier)
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

function AddSupplierSheet({
  open,
  onOpenChange,
  supplier,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: Supplier | null
  onSave: (data: SupplierFormState, id?: string) => void
}) {
  const [form, setForm] = useState<SupplierFormState>(emptyForm)
  const isEdit = Boolean(supplier)

  useEffect(() => {
    if (open) {
      setForm(
        supplier
          ? {
              name: supplier.name,
              email: supplier.email,
              phone: supplier.phone,
              city: supplier.city,
              balance: String(supplier.balance ?? 0),
              notes: supplier.notes ?? "",
            }
          : emptyForm
      )
    }
  }, [open, supplier])

  return (
    <SheetBase
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Modifier le fournisseur" : "Ajouter un fournisseur"}
      description="Feuille latérale inspirée du module Inventaire. Les actions sont en mode démo."
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          onSave(form, supplier?.id)
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom du fournisseur">
            <Input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Raison sociale"
              required
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="contact@exemple.ma"
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
          <Field label="Balance (MAD)">
            <Input
              type="number"
              step="0.01"
              value={form.balance}
              onChange={(event) => setForm((prev) => ({ ...prev, balance: event.target.value }))}
            />
          </Field>
        </div>

        <Field label="Notes internes">
          <Textarea
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Infos logistiques, conditions négociées..."
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

function SupplierProfileSheet({
  supplier,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  supplier: Supplier | null
  onOpenChange: (open: boolean) => void
  onEdit: (supplier: Supplier) => void
  onDelete: (id: string) => void
}) {
  if (!supplier) return null

  const balancePositive = supplier.balance >= 0

  return (
    <SheetBase
      open={Boolean(supplier)}
      onOpenChange={onOpenChange}
      title={supplier.name}
      description="Profil fournisseur – balance, documents et paiements."
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="size-4" />
              <span>{supplier.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="size-4" />
              <span>{supplier.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              <span>{supplier.city}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={balancePositive ? "secondary" : "destructive"} className="text-sm">
              Balance {balancePositive ? "crédit" : "dû"} · {formatCurrency(Math.abs(supplier.balance))}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => onEdit(supplier)}>
              Modifier
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete(supplier.id)}>
              Supprimer
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ProfileStat label="Bons de livraison" value={`${supplier.deliveries.length} en cours`} icon={<Truck className="size-4" />} />
          <ProfileStat label="Bons de commande" value={`${supplier.purchaseOrders.length} suivis`} icon={<FileText className="size-4" />} />
          <ProfileStat label="Paiements" value={`${supplier.payments.length} enregistrés`} icon={<CreditCard className="size-4" />} />
        <ProfileStat
          label="Balance"
          value={formatCurrency(supplier.balance)}
          tone={balancePositive ? "success" : "danger"}
        />
      </div>

        {supplier.notes ? (
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-sm font-semibold text-foreground">Notes internes</p>
            <p className="text-sm text-muted-foreground">{supplier.notes}</p>
          </div>
        ) : null}

        <ProfileSection title="Bons de livraison" icon={<Truck className="size-4 text-muted-foreground" />}>
          {supplier.deliveries.length ? (
            supplier.deliveries.map((delivery) => (
              <ProfileRow
                key={delivery.id}
                title={delivery.id}
                subtitle={`${delivery.date} · ${delivery.reference}`}
                value={formatCurrency(delivery.amount)}
                status={delivery.status === "delivered" ? "Livré" : "En cours"}
                tone={delivery.status === "delivered" ? "success" : "warning"}
              />
            ))
          ) : (
            <EmptyRow message="Aucun bon de livraison" />
          )}
        </ProfileSection>

        <ProfileSection title="Bons de commande" icon={<FileText className="size-4 text-muted-foreground" />}>
          {supplier.purchaseOrders.length ? (
            supplier.purchaseOrders.map((order) => (
              <ProfileRow
                key={order.id}
                title={order.id}
                subtitle={`${order.date} · ${order.channel}`}
                value={formatCurrency(order.amount)}
                status={statusLabel(order.status)}
                tone={statusTone(order.status)}
              />
            ))
          ) : (
            <EmptyRow message="Aucun bon de commande" />
          )}
        </ProfileSection>

        <ProfileSection title="Paiements" icon={<CreditCard className="size-4 text-muted-foreground" />}>
          {supplier.payments.length ? (
            supplier.payments.map((payment) => (
              <ProfileRow
                key={payment.id}
                title={payment.method}
                subtitle={payment.date}
                value={formatCurrency(payment.amount)}
                tone="neutral"
              />
            ))
          ) : (
            <EmptyRow message="Aucun paiement" />
          )}
        </ProfileSection>
      </div>
    </SheetBase>
  )
}

function ProfileSection({
  title,
  icon,
  children,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        <span>{title}</span>
      </div>
      <div className="divide-y divide-border rounded-lg border bg-background">
        {children}
      </div>
    </div>
  )
}

function ProfileRow({
  title,
  subtitle,
  value,
  status,
  tone = "neutral",
}: {
  title: string
  subtitle: string
  value: string
  status?: string
  tone?: "success" | "warning" | "danger" | "neutral"
}) {
  const statusClass = {
    success: "text-emerald-600",
    warning: "text-amber-600",
    danger: "text-destructive",
    neutral: "text-muted-foreground",
  }[tone]

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-foreground">{value}</p>
        {status ? <p className={cn("text-xs font-medium", statusClass)}>{status}</p> : null}
      </div>
    </div>
  )
}

function EmptyRow({ message }: { message: string }) {
  return <div className="px-4 py-3 text-sm text-muted-foreground">{message}</div>
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

function statusLabel(status: Supplier["purchaseOrders"][number]["status"]) {
  switch (status) {
    case "confirmed":
      return "Confirmé"
    case "delivered":
      return "Livré"
    default:
      return "Brouillon"
  }
}

function statusTone(status: Supplier["purchaseOrders"][number]["status"]): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "delivered":
      return "success"
    case "confirmed":
      return "neutral"
    case "draft":
    default:
      return "warning"
  }
}
