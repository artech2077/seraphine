import { DataTable } from "@/components/data-table"
import { DataTableFooter } from "@/components/data-table-footer"
import { FiltersBar } from "@/components/filters-bar"
import { FilterMultiCombobox } from "@/components/filter-multi-combobox"
import { FilterMultiSelect } from "@/components/filter-multi-select"
import { PageShell } from "@/components/page-shell"
import {
  InventoryTable,
  type InventoryItem,
} from "@/components/inventory-table"
import { InventoryProductModal } from "@/components/inventory-product-modal"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Plus } from "lucide-react"

const inventoryItems: InventoryItem[] = [
  {
    id: "prod-001",
    name: "Paracetamol 500mg",
    barcode: "6112345678901",
    stock: 48,
    threshold: 20,
    purchasePrice: 12.5,
    sellingPrice: 18.9,
    vatRate: 7,
    category: "Medicaments",
    dosageForm: "Comprime",
  },
  {
    id: "prod-002",
    name: "Ibuprofene 400mg",
    barcode: "6112345678902",
    stock: 14,
    threshold: 25,
    purchasePrice: 9.2,
    sellingPrice: 14.4,
    vatRate: 7,
    category: "Medicaments",
    dosageForm: "Comprime",
  },
  {
    id: "prod-003",
    name: "Vitamine C 1000",
    barcode: "6112345678903",
    stock: 32,
    threshold: 15,
    purchasePrice: 6.8,
    sellingPrice: 11.5,
    vatRate: 0,
    category: "Parapharmacie",
    dosageForm: "Pastille",
  },
  {
    id: "prod-004",
    name: "Gaze sterile 10x10",
    barcode: "6112345678904",
    stock: 6,
    threshold: 10,
    purchasePrice: 2.4,
    sellingPrice: 4.2,
    vatRate: 7,
    category: "Materiel",
    dosageForm: "Consommable",
  },
  {
    id: "prod-005",
    name: "Gel hydroalcoolique 250ml",
    barcode: undefined,
    stock: 22,
    threshold: 12,
    purchasePrice: 7.6,
    sellingPrice: 13.9,
    vatRate: 19,
    category: "Hygiene",
    dosageForm: "Flacon",
  },
]

export default function Page() {
  return (
    <PageShell
      title="Inventaire"
      description="Gérez vos stocks, références et niveaux de disponibilité."
      actions={
        <InventoryProductModal
          mode="create"
          trigger={
            <Button>
              <Plus className="size-4" />
              Ajouter un produit
            </Button>
          }
        />
      }
    >
      <DataTable
        toolbar={
          <FiltersBar>
            <FilterMultiCombobox
              options={[
                "Tous les produits",
                "Paracetamol",
                "Ibuprofene",
                "Gel hydroalcoolique antiseptique extra longue duree 750ml edition professionnelle",
                "Vitamine C",
                "Bandes de gaze",
                "Solution antiseptique usage hospitalier longue duree",
              ]}
              label="Produits"
            />
            <FilterMultiSelect
              label="Code barre"
              options={[
                "Tous",
                "Avec code barre",
                "Sans code barre",
                "Sans code barre confirme apres verification complete",
              ]}
            />
            <FilterMultiSelect
              label="Fournisseurs"
              options={[
                "Tous les fournisseurs",
                "Fournisseur principal",
                "Fournisseur secondaire",
                "Groupe d'approvisionnement pharmaceutique international",
              ]}
            />
            <FilterMultiSelect
              label="Stock"
              options={[
                "Tous",
                "Stock bas",
                "Critique",
                "Stock en commande a livraison differee",
              ]}
            />
            <FilterMultiSelect
              label="TVA"
              options={[
                "Toutes",
                "0%",
                "7%",
                "19%",
                "Exonere selon convention speciale",
              ]}
            />
            <FilterMultiSelect
              label="Categories"
              options={[
                "Toutes",
                "Medicaments",
                "Parapharmacie",
                "Materiel medico-chirurgical usage unique",
              ]}
            />
          </FiltersBar>
        }
        footer={
          <DataTableFooter
            rangeLabel="1-5 sur 28 produits"
            selectId="inventory-items-per-page"
            pagination={
              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" isActive>
                      1
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">2</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">3</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext href="#" />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            }
          />
        }
      >
        <InventoryTable items={inventoryItems} />
      </DataTable>
    </PageShell>
  )
}
