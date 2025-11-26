import { Percent, Plus, Trash2, Usb } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

const ArticlesVendusCard = () => {
  return (
    <Card className="bg-card text-card-foreground shadow-xs border border-border rounded-xl">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              ARTICLES VENDUS
            </div>
            <div className="mt-1 text-base font-semibold text-foreground">
              Composez chaque ligne produit, quantités et prix.
            </div>
          </div>
          <div className="ml-auto flex items-start gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Usb className="h-4 w-4" />
              <span>Scanner USB</span>
            </Button>
            <Button variant="default" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span>Ajouter une ligne</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_auto] items-start gap-3 rounded-md bg-background p-3">
          <div className="space-y-2">
            <Label
              htmlFor="line-produit"
              className="mb-1 text-xs text-muted-foreground"
            >
              Produit
            </Label>
            <Select>
              <SelectTrigger id="line-produit" size="default" className="w-full bg-card">
                <SelectValue placeholder="Sélectionner ou rechercher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="article-1">Article 1</SelectItem>
                <SelectItem value="article-2">Article 2</SelectItem>
                <SelectItem value="article-3">Article 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="line-quantite" className="mb-1 text-xs text-muted-foreground">
              Quantité
            </Label>
            <Input id="line-quantite" type="number" defaultValue={1} className="text-right" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="line-prix" className="mb-1 text-xs text-muted-foreground">
              Prix unitaire
            </Label>
            <Input id="line-prix" type="number" defaultValue={0} className="text-right" />
          </div>

          <div className="space-y-2">
            <Label className="mb-1 text-xs text-muted-foreground text-right">
              Total ligne
            </Label>
            <div className="flex h-9 items-center text-sm font-medium text-foreground">0,00 MAD</div>
          </div>

          <div className="space-y-2">
            <Label className="mb-1 text-xs text-muted-foreground text-right">
              {"\u00a0"}
            </Label>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex justify-end mt-3 text-sm">
          <span className="text-muted-foreground">Total TTC estimé</span>
          <span className="ml-2 font-semibold text-foreground">0,00 MAD</span>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 items-start">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <span>Remise</span>
            </div>

            <div className="mt-4 grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-3">
              <div>
                <Select>
                  <SelectTrigger className="w-full bg-card">
                    <SelectValue placeholder="Aucune remise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune remise</SelectItem>
                    <SelectItem value="percent">Pourcentage</SelectItem>
                    <SelectItem value="amount">Montant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Input
                  type="number"
                  defaultValue={0}
                  className="text-right"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-4 text-base font-semibold text-foreground">Mode de paiement</div>
            <Select>
              <SelectTrigger className="w-full bg-card">
                <SelectValue placeholder="Espèces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Espèces</SelectItem>
                <SelectItem value="card">Carte bancaire</SelectItem>
                <SelectItem value="transfer">Virement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="mb-4 text-base font-semibold text-foreground">Client</div>
            <Select>
              <SelectTrigger className="w-full bg-card">
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client-1">Client 1</SelectItem>
                <SelectItem value="client-2">Client 2</SelectItem>
                <SelectItem value="client-3">Client 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="mb-4 text-base font-semibold text-foreground">Notes</div>
            <Textarea placeholder="Ajouter une note" />
          </div>
        </div>

        <Card className="border border-border bg-card text-card-foreground shadow-xs">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Sous-total</span>
              <span className="text-foreground">0,00 MAD</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Remise</span>
              <span className="text-foreground">0,00 MAD</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-base font-semibold text-foreground">
              <span>Total à encaisser</span>
              <span className="text-primary">0,00 MAD</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button className="gap-2">
            <span>Enregistrer la vente</span>
          </Button>
        </div>

      </CardContent>
    </Card>
  )
}

export default ArticlesVendusCard
