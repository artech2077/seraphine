"use client"

import * as React from "react"
import { CheckCircle2, FileText, UploadCloud } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { parseBatchProducts } from "@/features/inventaire/batch-products"
import type { InventoryFormValues } from "@/features/inventaire/api"
import { useRoleAccess } from "@/lib/auth/use-role-access"
import { toast } from "sonner"

type BatchProductModalProps = {
  trigger?: React.ReactElement
  onSubmit?: (items: InventoryFormValues[]) => void | Promise<void>
}

const BATCH_SAMPLE =
  "Nom;Code barre;Categorie;Forme galenique;Prix achat;Prix vente;TVA;Stock;Seuil\nDoliprane 500;6111111111111;Medicaments;Comprime;12.5;16;7;20;5\nVitamine C;6111111111112;Parapharmacie;Sachet;8;12;20;15;3"

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} o`
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} Ko`
  }
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`
}

function readFileAsText(file: File) {
  if (typeof file.text === "function") {
    return file.text()
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Impossible de lire le fichier."))
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.readAsText(file)
  })
}

export function BatchProductModal({ trigger, onSubmit }: BatchProductModalProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const { canManage } = useRoleAccess()
  const canManageInventory = canManage("inventaire")

  const acceptedFormats = ".csv,.txt,text/csv,text/plain"

  function handleFileSelection(nextFile: File | null) {
    setSelectedFile(nextFile)
  }

  function clearSelection() {
    setSelectedFile(null)
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedFile) {
      toast.error("Selectionnez un document d'import.")
      return
    }

    const extension = selectedFile.name.split(".").pop()?.toLowerCase()
    if (extension !== "csv" && extension !== "txt") {
      toast.error("Format non supporte. Utilisez un fichier CSV ou TXT.")
      return
    }

    const content = await readFileAsText(selectedFile)
    const parsed = parseBatchProducts(content)

    if (parsed.errors.length > 0) {
      const errorPreview = parsed.errors
        .slice(0, 3)
        .map((error) => `Ligne ${error.line}: ${error.message}`)
        .join(" | ")
      toast.error(`Import invalide. ${errorPreview}`)
      return
    }

    if (parsed.items.length === 0) {
      toast.error("Ajoutez au moins une ligne produit.")
      return
    }

    setSubmitting(true)
    try {
      await onSubmit?.(parsed.items)
      setSelectedFile(null)
      setOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent showCloseButton className="gap-0 border p-0 sm:max-w-2xl">
        <DialogHeader className="gap-1 border-b px-5 py-4">
          <DialogTitle>Ajouter des produits en lot</DialogTitle>
          <DialogDescription>
            Importez un document CSV ou TXT pour créer plusieurs produits en une seule action.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="batch-products-file">Document d&apos;import</Label>
              <Input
                ref={inputRef}
                id="batch-products-file"
                type="file"
                className="sr-only"
                accept={acceptedFormats}
                onChange={(event) => handleFileSelection(event.target.files?.[0] ?? null)}
              />
              <label
                htmlFor="batch-products-file"
                className="bg-muted/40 hover:bg-muted/60 focus-within:ring-ring group block cursor-pointer rounded-lg border-2 border-dashed p-4 transition-colors focus-within:ring-2"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-background text-muted-foreground rounded-md border p-2">
                    <UploadCloud className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {selectedFile
                        ? "Document prêt pour l'import"
                        : "Cliquez ici pour choisir votre document"}
                    </p>
                    <p className="text-muted-foreground text-xs">Formats supportés: CSV, TXT</p>
                  </div>
                  <span className="bg-background text-foreground rounded-md border px-3 py-1.5 text-xs font-medium">
                    Choisir un fichier
                  </span>
                </div>
              </label>
              {selectedFile ? (
                <div className="bg-background flex items-center justify-between rounded-md border p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="text-emerald-600 size-4" />
                      <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                    Retirer
                  </Button>
                </div>
              ) : (
                <div className="bg-background text-muted-foreground rounded-md border p-3 text-xs">
                  Aucun fichier sélectionné.
                </div>
              )}
            </div>
            <div className="bg-muted/40 rounded-lg border p-3">
              <div className="mb-2 flex items-center gap-2">
                <FileText className="text-muted-foreground size-4" />
                <p className="text-sm font-medium">Structure du fichier</p>
                <Badge variant="secondary">Separateur: ;</Badge>
              </div>
              <p className="text-muted-foreground text-xs">
                Nom;Code barre;Categorie;Forme galenique;Prix achat;Prix vente;TVA;Stock;Seuil
              </p>
              <p className="text-muted-foreground mt-2 text-xs">Exemple</p>
              <p className="text-foreground mt-1 font-mono text-xs">
                {BATCH_SAMPLE.split("\n")[1]}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!canManageInventory || submitting || !selectedFile}>
              Importer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
