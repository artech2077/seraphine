"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { OrganizationList, OrganizationSwitcher } from "@clerk/nextjs"

import { ContentCard } from "@/components/layout/content-card"
import { PageShell } from "@/components/layout/page-shell"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRoleAccess } from "@/lib/auth/use-role-access"

const TAB_STORAGE_KEY = "parametres:last-tab"
const DEFAULT_TAB = "pharmacies"

type ParametresTab = "pharmacies"

export function ParametresPage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = React.useState<ParametresTab>(DEFAULT_TAB)
  const { canManageSettings } = useRoleAccess()

  React.useEffect(() => {
    const tabParam = searchParams.get("tab")
    if (tabParam === "pharmacies") {
      setActiveTab("pharmacies")
      window.localStorage.setItem(TAB_STORAGE_KEY, "pharmacies")
      return
    }

    const stored = window.localStorage.getItem(TAB_STORAGE_KEY)
    if (stored === "pharmacies") {
      setActiveTab("pharmacies")
    }
  }, [searchParams])

  const handleTabChange = React.useCallback((value: string) => {
    if (value !== "pharmacies") {
      return
    }
    setActiveTab("pharmacies")
    window.localStorage.setItem(TAB_STORAGE_KEY, "pharmacies")
  }, [])

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <PageShell
        title="Paramètres"
        description="Configurez les préférences et les accès de votre équipe."
        tabs={
          <TabsList variant="line">
            <TabsTrigger value="pharmacies">Pharmacies</TabsTrigger>
          </TabsList>
        }
      >
        <TabsContent value="pharmacies" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {canManageSettings ? (
              <>
                <ContentCard
                  title="Pharmacie active"
                  description="Changez l'organisation utilisée pour les données."
                  contentClassName="space-y-4"
                >
                  <OrganizationSwitcher
                    afterCreateOrganizationUrl="/app"
                    afterSelectOrganizationUrl="/app"
                    hidePersonal
                  />
                  <div className="text-muted-foreground text-sm">
                    Sélectionnez la pharmacie active avant de continuer vos ventes, stocks et
                    achats.
                  </div>
                </ContentCard>
                <ContentCard
                  title="Toutes les pharmacies"
                  description="Gérez vos organisations et créez de nouvelles pharmacies."
                  contentClassName="space-y-4"
                >
                  <OrganizationList
                    afterCreateOrganizationUrl="/app"
                    afterSelectOrganizationUrl="/app"
                    hidePersonal
                  />
                </ContentCard>
              </>
            ) : (
              <ContentCard
                title="Accès réservé"
                description="La gestion des pharmacies est réservée aux propriétaires."
                contentClassName="space-y-2"
              >
                <div className="text-muted-foreground text-sm">
                  Demandez à un propriétaire de votre organisation de mettre à jour les paramètres.
                </div>
              </ContentCard>
            )}
          </div>
        </TabsContent>
      </PageShell>
    </Tabs>
  )
}
