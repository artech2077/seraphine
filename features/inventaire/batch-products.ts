import type { InventoryFormValues } from "@/features/inventaire/api"

export type BatchProductParseError = {
  line: number
  message: string
}

export type BatchProductParseResult = {
  items: InventoryFormValues[]
  errors: BatchProductParseError[]
}

const DEFAULT_CATEGORY = "Medicaments"

function parseNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return 0
  }
  const normalized = trimmed.replace(",", ".")
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function isHeaderLine(cells: string[]) {
  const firstCell = (cells[0] ?? "").trim().toLowerCase()
  return firstCell === "nom" || firstCell === "name"
}

export function parseBatchProducts(raw: string): BatchProductParseResult {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const items: InventoryFormValues[] = []
  const errors: BatchProductParseError[] = []

  lines.forEach((line, index) => {
    const lineNumber = index + 1
    const cells = line.split(";").map((cell) => cell.trim())

    if (isHeaderLine(cells)) {
      return
    }

    if (cells.length > 9) {
      errors.push({
        line: lineNumber,
        message: "Trop de colonnes. Utilisez 9 colonnes maximum.",
      })
      return
    }

    const [
      name = "",
      barcode = "",
      category = DEFAULT_CATEGORY,
      dosageForm = "",
      purchasePriceRaw = "0",
      sellingPriceRaw = "0",
      vatRateRaw = "0",
      stockRaw = "0",
      thresholdRaw = "0",
    ] = cells

    if (!name) {
      errors.push({ line: lineNumber, message: "Nom du produit manquant." })
      return
    }

    const purchasePrice = parseNumber(purchasePriceRaw)
    const sellingPrice = parseNumber(sellingPriceRaw)
    const vatRate = parseNumber(vatRateRaw)
    const stock = parseNumber(stockRaw)
    const threshold = parseNumber(thresholdRaw)

    if (
      purchasePrice === null ||
      sellingPrice === null ||
      vatRate === null ||
      stock === null ||
      threshold === null
    ) {
      errors.push({
        line: lineNumber,
        message: "Valeur numerique invalide (prix, TVA, stock ou seuil).",
      })
      return
    }

    if (purchasePrice < 0 || sellingPrice < 0 || vatRate < 0 || stock < 0 || threshold < 0) {
      errors.push({
        line: lineNumber,
        message: "Les valeurs numeriques doivent etre positives.",
      })
      return
    }

    items.push({
      name,
      barcode,
      category: category || DEFAULT_CATEGORY,
      dosageForm,
      purchasePrice,
      sellingPrice,
      vatRate,
      stock,
      threshold,
      notes: "",
    })
  })

  return { items, errors }
}
