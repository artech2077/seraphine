import { PageShell } from "@/components/page-shell"
import { FiltersBar } from "@/components/filters-bar"
import { Button } from "@/components/ui/button"
import { DatePickerField } from "@/components/date-picker-field"
import { FilterMultiSelect } from "@/components/filter-multi-select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus } from "lucide-react"

export default function Page() {
  return (
    <PageShell
      title="Achats"
      description="Centralisez vos commandes et vos dépenses fournisseurs."
      actions={
        <Button>
          <Plus className="size-4" />
          Créer un bon de commande
        </Button>
      }
      tabs={
        <Tabs defaultValue="commande">
          <TabsList variant="line">
            <TabsTrigger value="commande">Bons de commande</TabsTrigger>
            <TabsTrigger value="livraison">Bons de livraison</TabsTrigger>
          </TabsList>
        </Tabs>
      }
      filters={
        <FiltersBar>
          <DatePickerField className="w-44" placeholder="Date du bon" />
          <DatePickerField className="w-44" placeholder="Date de création" />
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
            label="Statut"
            options={["Tous", "Brouillon", "Commandé", "Livré"]}
            className="min-w-28"
          />
        </FiltersBar>
      }
    />
  )
}
