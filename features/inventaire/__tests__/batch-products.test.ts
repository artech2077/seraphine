import { parseBatchProducts } from "@/features/inventaire/batch-products"

describe("parseBatchProducts", () => {
  it("parses valid product lines", () => {
    const result = parseBatchProducts(
      [
        "Nom;Code barre;Categorie;Forme galenique;Prix achat;Prix vente;TVA;Stock;Seuil",
        "Doliprane;611111;Medicaments;Comprime;10,5;12;7;20;5",
      ].join("\n")
    )

    expect(result.errors).toEqual([])
    expect(result.items).toEqual([
      {
        name: "Doliprane",
        barcode: "611111",
        category: "Medicaments",
        dosageForm: "Comprime",
        purchasePrice: 10.5,
        sellingPrice: 12,
        vatRate: 7,
        stock: 20,
        threshold: 5,
        notes: "",
      },
    ])
  })

  it("defaults missing optional values", () => {
    const result = parseBatchProducts("Produit X;;;;;;;")

    expect(result.errors).toEqual([])
    expect(result.items[0]).toEqual({
      name: "Produit X",
      barcode: "",
      category: "Medicaments",
      dosageForm: "",
      purchasePrice: 0,
      sellingPrice: 0,
      vatRate: 0,
      stock: 0,
      threshold: 0,
      notes: "",
    })
  })

  it("returns errors for invalid rows", () => {
    const result = parseBatchProducts([";123", "Test;;;;abc"].join("\n"))

    expect(result.items).toEqual([])
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0]?.line).toBe(1)
    expect(result.errors[1]?.line).toBe(2)
  })
})
