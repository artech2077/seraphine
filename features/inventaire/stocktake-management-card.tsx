"use client"

import * as React from "react"
import { toast } from "sonner"

import { ContentCard } from "@/components/layout/content-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useStocktakeSessions, type StocktakeSessionItem } from "@/features/inventaire/api"
import { useRoleAccess } from "@/lib/auth/use-role-access"

function getStatusLabel(status: "DRAFT" | "COUNTING" | "FINALIZED") {
  if (status === "DRAFT") return "Brouillon"
  if (status === "COUNTING") return "Comptage"
  return "Finalisé"
}

function getStatusVariant(status: "DRAFT" | "COUNTING" | "FINALIZED") {
  if (status === "DRAFT") return "secondary" as const
  if (status === "COUNTING") return "warning" as const
  return "success" as const
}

function formatDate(value: number | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

type DraftCountMap = Record<
  string,
  {
    countedQuantity: string
    note: string
  }
>

function toDefaultCount(item: StocktakeSessionItem) {
  const count = item.countedQuantity ?? item.expectedQuantity
  return String(count)
}

function toNumber(value: string, fallback: number) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function StocktakeManagementCard() {
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | undefined>(undefined)
  const [open, setOpen] = React.useState(false)
  const [draftCounts, setDraftCounts] = React.useState<DraftCountMap>({})
  const {
    sessions,
    selectedSession,
    isLoading,
    isUnavailable,
    hasOrg,
    createSession,
    startSession,
    finalizeSession,
  } = useStocktakeSessions(selectedSessionId)
  const { canManage } = useRoleAccess()
  const canManageInventory = canManage("inventaire")

  React.useEffect(() => {
    if (!selectedSession || selectedSession.status !== "COUNTING") {
      setDraftCounts({})
      return
    }

    const nextDraft: DraftCountMap = {}
    selectedSession.items.forEach((item) => {
      nextDraft[item.productId] = {
        countedQuantity: toDefaultCount(item),
        note: item.note,
      }
    })
    setDraftCounts(nextDraft)
  }, [selectedSession])

  const selectedSummary = React.useMemo(() => {
    if (!selectedSession) return null
    const counted = selectedSession.items.filter(
      (item) => typeof item.countedQuantity === "number"
    ).length
    const variances = selectedSession.items.filter(
      (item) => (item.varianceQuantity ?? 0) !== 0
    ).length
    return {
      total: selectedSession.items.length,
      counted,
      variances,
    }
  }, [selectedSession])

  async function handleCreateSession() {
    try {
      const stocktakeId = await createSession()
      if (!stocktakeId) return
      setSelectedSessionId(String(stocktakeId))
      setOpen(true)
      toast.success("Session de comptage créée.")
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
        return
      }
      toast.error("Impossible de créer la session.")
    }
  }

  async function handleStartSession() {
    if (!selectedSession) return
    try {
      await startSession(String(selectedSession.id))
      toast.success("Session démarrée. Vous pouvez saisir les quantités comptées.")
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
        return
      }
      toast.error("Impossible de démarrer la session.")
    }
  }

  async function handleFinalizeSession() {
    if (!selectedSession || selectedSession.status !== "COUNTING") return

    const counts = selectedSession.items.map((item) => {
      const draft = draftCounts[item.productId]
      const countedQuantity = toNumber(
        draft?.countedQuantity ?? toDefaultCount(item),
        item.expectedQuantity
      )
      return {
        productId: item.productId,
        countedQuantity,
        note: draft?.note?.trim() || undefined,
      }
    })

    if (counts.some((item) => item.countedQuantity < 0)) {
      toast.error("Les quantités comptées doivent être positives ou nulles.")
      return
    }

    try {
      await finalizeSession(String(selectedSession.id), counts)
      toast.success("Inventaire finalisé et variances appliquées.")
      setOpen(false)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
        return
      }
      toast.error("Impossible de finaliser la session.")
    }
  }

  return (
    <>
      <ContentCard
        title="Sessions d'inventaire physique"
        description="Créez un comptage, saisissez les quantités et appliquez les écarts en une finalisation."
      >
        <div className="mb-4 flex items-center justify-end">
          <Button
            disabled={!hasOrg || !canManageInventory || isUnavailable}
            onClick={handleCreateSession}
          >
            Nouveau comptage
          </Button>
        </div>

        {!hasOrg ? (
          <p className="text-muted-foreground">
            Sélectionnez une pharmacie pour lancer un inventaire physique.
          </p>
        ) : null}

        {hasOrg && isUnavailable ? (
          <p className="text-muted-foreground">
            Les requêtes de session d&apos;inventaire ne sont pas encore disponibles côté Convex.
            Lancez <code>npx convex dev</code> ou <code>npx convex deploy</code> puis rechargez la
            page.
          </p>
        ) : null}

        {hasOrg && isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={`stocktake-session-skeleton-${index}`} className="h-8 w-full" />
            ))}
          </div>
        ) : null}

        {hasOrg && !isUnavailable && !isLoading && sessions.length === 0 ? (
          <p className="text-muted-foreground">
            Aucune session d&apos;inventaire. Lancez un nouveau comptage.
          </p>
        ) : null}

        {hasOrg && !isUnavailable && !isLoading && sessions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Progression</TableHead>
                <TableHead className="text-right">Créée le</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.name}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(session.status)}>
                      {getStatusLabel(session.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {session.countedCount}/{session.itemsCount}
                  </TableCell>
                  <TableCell className="text-right">{formatDate(session.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSessionId(String(session.id))
                        setOpen(true)
                      }}
                    >
                      Ouvrir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </ContentCard>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent showCloseButton>
          <ModalHeader showCloseButton>
            <ModalTitle>{selectedSession?.name ?? "Session d'inventaire"}</ModalTitle>
            <ModalDescription>
              {selectedSession
                ? `Statut: ${getStatusLabel(selectedSession.status)}`
                : "Chargement de la session..."}
            </ModalDescription>
          </ModalHeader>
          <ModalBody>
            {!selectedSession ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={`stocktake-modal-skeleton-${index}`} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border p-3 text-sm">
                    <p className="text-muted-foreground">Lignes</p>
                    <p className="font-semibold tabular-nums">{selectedSummary?.total ?? 0}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-sm">
                    <p className="text-muted-foreground">Comptées</p>
                    <p className="font-semibold tabular-nums">{selectedSummary?.counted ?? 0}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-sm">
                    <p className="text-muted-foreground">Variances</p>
                    <p className="font-semibold tabular-nums">{selectedSummary?.variances ?? 0}</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead className="text-right">Théorique</TableHead>
                      <TableHead className="text-right">Compté</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSession.items.map((item) => {
                      const draft = draftCounts[item.productId]
                      const countedQuantity = toNumber(
                        draft?.countedQuantity ?? toDefaultCount(item),
                        item.expectedQuantity
                      )
                      const variance = countedQuantity - item.expectedQuantity
                      const isReadOnly = selectedSession.status !== "COUNTING"

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {item.expectedQuantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {isReadOnly ? (
                              <span className="tabular-nums">
                                {item.countedQuantity ?? item.expectedQuantity}
                              </span>
                            ) : (
                              <Input
                                type="number"
                                min={0}
                                value={draft?.countedQuantity ?? toDefaultCount(item)}
                                onChange={(event) =>
                                  setDraftCounts((current) => ({
                                    ...current,
                                    [item.productId]: {
                                      countedQuantity: event.target.value,
                                      note: current[item.productId]?.note ?? item.note,
                                    },
                                  }))
                                }
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{variance}</TableCell>
                          <TableCell>
                            {isReadOnly ? (
                              <span className="text-muted-foreground">{item.note || "-"}</span>
                            ) : (
                              <Textarea
                                value={draft?.note ?? item.note}
                                onChange={(event) =>
                                  setDraftCounts((current) => ({
                                    ...current,
                                    [item.productId]: {
                                      countedQuantity:
                                        current[item.productId]?.countedQuantity ??
                                        toDefaultCount(item),
                                      note: event.target.value,
                                    },
                                  }))
                                }
                                placeholder="Observation optionnelle"
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                <div className="text-muted-foreground text-sm">
                  <p>Créée le: {formatDate(selectedSession.createdAt)}</p>
                  <p>Démarrée le: {formatDate(selectedSession.startedAt)}</p>
                  <p>Finalisée le: {formatDate(selectedSession.finalizedAt)}</p>
                </div>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <ModalClose
              render={
                <Button variant="outline" type="button">
                  Fermer
                </Button>
              }
            />
            {selectedSession?.status === "DRAFT" ? (
              <Button disabled={!canManageInventory} onClick={handleStartSession}>
                Démarrer le comptage
              </Button>
            ) : null}
            {selectedSession?.status === "COUNTING" ? (
              <Button disabled={!canManageInventory} onClick={handleFinalizeSession}>
                Finaliser et appliquer
              </Button>
            ) : null}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
