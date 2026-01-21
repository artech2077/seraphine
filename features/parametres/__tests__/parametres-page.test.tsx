import { render, screen } from "@testing-library/react"
import { vi } from "vitest"

import { ParametresPage } from "@/features/parametres/parametres-page"

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}))

vi.mock("@clerk/nextjs", () => ({
  OrganizationList: () => <div>OrganizationList</div>,
  OrganizationSwitcher: () => <div>OrganizationSwitcher</div>,
}))

const mockRoleAccess = vi.fn()

vi.mock("@/lib/auth/use-role-access", () => ({
  useRoleAccess: () => mockRoleAccess(),
}))

describe("ParametresPage", () => {
  it("shows restricted message when access denied", () => {
    mockRoleAccess.mockReturnValue({ canManageSettings: false })

    render(<ParametresPage />)

    expect(screen.getByText("Accès réservé")).toBeInTheDocument()
  })

  it("shows pharmacy settings when allowed", () => {
    mockRoleAccess.mockReturnValue({ canManageSettings: true })

    render(<ParametresPage />)

    expect(screen.getByText("Pharmacie active")).toBeInTheDocument()
    expect(screen.getByText("OrganizationSwitcher")).toBeInTheDocument()
  })
})
