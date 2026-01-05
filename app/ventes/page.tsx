import { DataTable } from "@/components/data-table"
import { DatePickerField } from "@/components/date-picker-field"
import { FilterMultiCombobox } from "@/components/filter-multi-combobox"
import { FilterMultiSelect } from "@/components/filter-multi-select"
import { FilterToggle } from "@/components/filter-toggle"
import { FiltersBar } from "@/components/filters-bar"
import { PageShell } from "@/components/page-shell"
import {
  SalesHistoryTable,
  type SaleHistoryItem,
} from "@/components/sales-history-table"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Printer } from "lucide-react"

const salesHistory: SaleHistoryItem[] = [
  {
    id: "sale-001",
    date: "08 Jan 2026",
    client: "Clinique Atlas",
    seller: "Nadia H.",
    paymentMethod: "Especes",
    amountTtc: 428.5,
    items: [
      {
        id: "line-001",
        product: "Paracetamol 500mg",
        quantity: 12,
        unitPriceHt: 12.5,
        vatRate: 7,
        discount: "-",
        totalTtc: 160.5,
      },
      {
        id: "line-002",
        product: "Vitamine C 1000",
        quantity: 8,
        unitPriceHt: 6.8,
        vatRate: 0,
        discount: "5%",
        totalTtc: 54.4,
      },
    ],
  },
  {
    id: "sale-002",
    date: "09 Jan 2026",
    client: "Pharmacie du Centre",
    seller: "Imane B.",
    paymentMethod: "Carte",
    amountTtc: 892.2,
    items: [
      {
        id: "line-003",
        product: "Ibuprofene 400mg",
        quantity: 20,
        unitPriceHt: 9.2,
        vatRate: 7,
        discount: "10%",
        totalTtc: 196.4,
      },
      {
        id: "line-004",
        product: "Gel hydroalcoolique 250ml",
        quantity: 15,
        unitPriceHt: 7.6,
        vatRate: 19,
        discount: "-",
        totalTtc: 226.1,
      },
      {
        id: "line-005",
        product: "Gaze sterile 10x10",
        quantity: 30,
        unitPriceHt: 2.4,
        vatRate: 7,
        discount: "-",
        totalTtc: 92.4,
      },
    ],
  },
  {
    id: "sale-003",
    date: "10 Jan 2026",
    client: "Dr. Rania L.",
    seller: "Youssef A.",
    paymentMethod: "Credit",
    amountTtc: 615.0,
    items: [
      {
        id: "line-006",
        product: "Serum physiologique 500ml",
        quantity: 10,
        unitPriceHt: 8.9,
        vatRate: 7,
        discount: "-",
        totalTtc: 95.2,
      },
      {
        id: "line-007",
        product: "Bandes elastiques",
        quantity: 6,
        unitPriceHt: 6.2,
        vatRate: 7,
        discount: "-",
        totalTtc: 39.8,
      },
    ],
  },
]

export default function Page() {
  return (
    <Tabs defaultValue="pos">
      <PageShell
        title="Ventes"
        description="Suivez vos transactions et la performance commerciale."
        tabs={
          <TabsList variant="line">
            <TabsTrigger value="pos">Point de vente</TabsTrigger>
            <TabsTrigger value="historique">Historique des ventes</TabsTrigger>
          </TabsList>
        }
      >
        <TabsContent value="pos">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Point de vente</CardTitle>
              <CardDescription>
                La zone de caisse s&apos;affichera ici avec la recherche produit,
                le panier et le paiement.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Ajoutez les composants POS pour simuler la vente en direct.
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="historique" className="space-y-4">
          <DataTable
            toolbar={
              <>
                <FiltersBar>
                  <DatePickerField placeholder="Date" />
                  <FilterMultiCombobox
                    label="Clients"
                    options={[
                      "Tous les clients",
                      "Clinique Atlas",
                      "Pharmacie du Centre",
                      "Dr. Rania L.",
                      "Clinique internationale Mohammed VI de consultation specialisee",
                    ]}
                  />
                  <FilterMultiSelect
                    label="Vendeurs"
                    options={[
                      "Tous les vendeurs",
                      "Nadia H.",
                      "Imane B.",
                      "Youssef A.",
                      "Equipe commerciale regionale du Nord Atlantique",
                    ]}
                  />
                  <FilterMultiCombobox
                    label="Produits"
                    options={[
                      "Tous les produits",
                      "Paracetamol 500mg",
                      "Gel hydroalcoolique antiseptique extra longue duree 750ml edition professionnelle",
                      "Ibuprofene 400mg",
                      "Vitamine C 1000",
                      "Gel hydroalcoolique 250ml",
                    ]}
                  />
                  <FilterMultiSelect
                    label="Paiements"
                    options={[
                      "Tous",
                      "Especes",
                      "Carte",
                      "Cheque",
                      "Credit",
                      "Virement bancaire international longue echeance",
                    ]}
                  />
                  <FilterToggle
                    id="remise-toggle"
                    label="Remise"
                  />
                </FiltersBar>
                <div className="ml-auto flex items-center gap-2">
                  <Button variant="outline" size="icon" aria-label="Imprimer">
                    <Printer className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Telecharger"
                  >
                    <Download className="size-4" />
                  </Button>
                </div>
              </>
            }
          >
            <SalesHistoryTable sales={salesHistory} />
          </DataTable>
        </TabsContent>
      </PageShell>
    </Tabs>
  )
}
