import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi } from "vitest"

import { BatchProductModal } from "@/features/inventaire/batch-product-modal"

vi.mock("@/lib/auth/use-role-access", () => ({
  useRoleAccess: () => ({
    canManage: () => true,
  }),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const { toast } = await import("sonner")
const mockedToast = toast as unknown as {
  success: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
}

describe("BatchProductModal", () => {
  beforeEach(() => {
    mockedToast.success.mockClear()
    mockedToast.error.mockClear()
  })

  it("submits parsed product lines", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<BatchProductModal onSubmit={onSubmit} trigger={<button type="button">Open</button>} />)

    await user.click(screen.getByRole("button", { name: "Open" }))
    const fileInput = screen.getByLabelText("Document d'import")
    const file = new File(["Doliprane;611111;Medicaments;Comprime;10;12;7;20;5"], "produits.csv", {
      type: "text/csv",
    })
    await user.upload(fileInput, file)
    await user.click(screen.getByRole("button", { name: "Importer" }))

    expect(onSubmit).toHaveBeenCalledWith([
      {
        name: "Doliprane",
        barcode: "611111",
        category: "Medicaments",
        dosageForm: "Comprime",
        purchasePrice: 10,
        sellingPrice: 12,
        vatRate: 7,
        stock: 20,
        threshold: 5,
        notes: "",
      },
    ])
  })

  it("shows an error toast when content is invalid", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<BatchProductModal onSubmit={onSubmit} trigger={<button type="button">Open</button>} />)

    await user.click(screen.getByRole("button", { name: "Open" }))
    const fileInput = screen.getByLabelText("Document d'import")
    const file = new File([";123"], "produits.csv", { type: "text/csv" })
    await user.upload(fileInput, file)
    await user.click(screen.getByRole("button", { name: "Importer" }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(mockedToast.error).toHaveBeenCalled()
  })
})
