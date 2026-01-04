import { PageShell } from "@/components/page-shell"
import { FiltersBar } from "@/components/filters-bar"
import { FilterMultiCombobox } from "@/components/filter-multi-combobox"
import { FilterMultiSelect } from "@/components/filter-multi-select"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function Page() {
  return (
    <PageShell
      title="Inventaire"
      description="Gérez vos stocks, références et niveaux de disponibilité."
      actions={
        <Button>
          <Plus className="size-4" />
          Ajouter un produit
        </Button>
      }
      filters={
        <FiltersBar>
          <FilterMultiCombobox
            options={[
              "Tous les produits",
              "Paracétamol",
              "Ibuprofène",
              "Vitamine C",
              "Bandes de gaze",
            ]}
            label="Produits"
            className="min-w-40"
          />
          <FilterMultiSelect
            label="Code barre"
            options={["Tous", "Avec code barre", "Sans code barre"]}
            className="min-w-32"
          />
          <FilterMultiSelect
            label="Fournisseurs"
            options={[
              "Tous les fournisseurs",
              "Fournisseur principal",
              "Fournisseur secondaire",
            ]}
            className="min-w-36"
          />
          <FilterMultiSelect
            label="Stock"
            options={["Tous", "Stock bas", "Critique"]}
            className="min-w-28"
          />
          <FilterMultiSelect
            label="TVA"
            options={["Toutes", "0%", "7%", "19%"]}
            className="min-w-24"
          />
          <FilterMultiSelect
            label="Catégories"
            options={["Toutes", "Médicaments", "Parapharmacie"]}
            className="min-w-32"
          />
        </FiltersBar>
      }
    />
  )
}
