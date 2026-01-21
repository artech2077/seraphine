import { renderHook } from "@testing-library/react"
import { vi } from "vitest"

import { useRoleAccess } from "@/lib/auth/use-role-access"
import { mockClerkAuth } from "@/tests/mocks/clerk"

vi.mock("@clerk/nextjs", () => ({
  useAuth: vi.fn(),
}))

const { useAuth } = await import("@clerk/nextjs")

describe("useRoleAccess", () => {
  it("marks owners with management access", () => {
    vi.mocked(useAuth).mockReturnValue(
      mockClerkAuth({
        orgRole: "admin" as ReturnType<typeof mockClerkAuth>["orgRole"],
      })
    )

    const { result } = renderHook(() => useRoleAccess())

    expect(result.current.isOwner).toBe(true)
    expect(result.current.canManage("ventes")).toBe(true)
  })

  it("restricts viewer access", () => {
    vi.mocked(useAuth).mockReturnValue(
      mockClerkAuth({
        orgRole: "viewer" as ReturnType<typeof mockClerkAuth>["orgRole"],
      })
    )

    const { result } = renderHook(() => useRoleAccess())

    expect(result.current.isRestricted).toBe(true)
    expect(result.current.canView("ventes")).toBe(false)
  })

  it("allows settings without org", () => {
    const auth = {
      ...mockClerkAuth(),
      orgId: null,
      orgRole: null,
    } as ReturnType<typeof useAuth>

    vi.mocked(useAuth).mockReturnValue(auth)

    const { result } = renderHook(() => useRoleAccess())

    expect(result.current.canManageSettings).toBe(true)
  })
})
