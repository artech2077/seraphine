import { PageShell } from "@/components/page-shell"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Page() {
  return (
    <PageShell
      title="Ventes"
      description="Suivez vos transactions et la performance commerciale."
      tabs={
        <Tabs defaultValue="pos">
          <TabsList variant="line">
            <TabsTrigger value="pos">Point de vente</TabsTrigger>
            <TabsTrigger value="historique">Historique des ventes</TabsTrigger>
          </TabsList>
        </Tabs>
      }
    />
  )
}
