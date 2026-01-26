import { renderHook, waitFor } from "@testing-library/react"
import { vi } from "vitest"

import { useEnsurePharmacy } from "@/hooks/use-ensure-pharmacy"
import { mockClerkAuth, mockOrganization } from "@/tests/mocks/clerk"
import { createMockMutation } from "@/tests/mocks/convex"

vi.mock("@clerk/nextjs", () => ({
  useAuth: vi.fn(),
  useOrganization: vi.fn(),
}))

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
}))

const { useAuth, useOrganization } = await import("@clerk/nextjs")
const { useMutation } = await import("convex/react")

describe("useEnsurePharmacy", () => {
  beforeEach(() => {
    vi.mocked(useMutation).mockReset()
    vi.mocked(useAuth).mockReset()
    vi.mocked(useOrganization).mockReset()
  })

  it("calls ensure mutation when org is loaded", async () => {
    const ensurePharmacy = createMockMutation()

    vi.mocked(useMutation).mockReturnValue(ensurePharmacy)
    vi.mocked(useAuth).mockReturnValue(mockClerkAuth({ orgId: "org-1" }))
    vi.mocked(useOrganization).mockReturnValue(mockOrganization({ name: "Pharmacie" }))

    renderHook(() => useEnsurePharmacy())

    await waitFor(() => {
      expect(ensurePharmacy).toHaveBeenCalledWith({ clerkOrgId: "org-1", name: "Pharmacie" })
    })
  })

  it("only re-runs when the org changes", async () => {
    const ensurePharmacy = createMockMutation()
    let orgId = "org-1"

    vi.mocked(useMutation).mockReturnValue(ensurePharmacy)
    vi.mocked(useAuth).mockImplementation(() => mockClerkAuth({ orgId }))
    vi.mocked(useOrganization).mockReturnValue(mockOrganization({ name: "Pharmacie" }))

    const { rerender } = renderHook(() => useEnsurePharmacy())

    await waitFor(() => {
      expect(ensurePharmacy).toHaveBeenCalledTimes(1)
    })

    rerender()
    await waitFor(() => {
      expect(ensurePharmacy).toHaveBeenCalledTimes(1)
    })

    orgId = "org-2"
    rerender()
    await waitFor(() => {
      expect(ensurePharmacy).toHaveBeenCalledTimes(2)
    })
  })
})
