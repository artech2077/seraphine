import { render, screen } from "@testing-library/react"
import { vi } from "vitest"

import { ClientsPage } from "@/features/clients/clients-page"

vi.mock("@/features/clients/api", () => ({
  useClients: () => ({
    items: [
      {
        id: "client-1",
        clientNumber: "CLI-01",
        name: "Client A",
        phone: "",
        city: "Rabat",
        plafond: 0,
        encours: 0,
        status: "OK",
        lastPurchase: "2026-01-01",
        notes: "",
      },
    ],
    isLoading: false,
    createClient: vi.fn(),
    updateClient: vi.fn(),
    removeClient: vi.fn(),
    totalCount: 42,
    filterOptions: { names: ["Client A"], cities: ["Rabat"] },
    exportClients: vi.fn().mockResolvedValue([]),
  }),
}))

vi.mock("@/lib/auth/use-role-access", () => ({
  useRoleAccess: () => ({
    canManage: () => true,
  }),
}))

describe("ClientsPage", () => {
  it("shows server-side pagination range", () => {
    render(<ClientsPage />)

    expect(screen.getByText("1-20 sur 42 clients")).toBeInTheDocument()
  })
})
