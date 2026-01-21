import { canManageModule, canViewModule, getAllModules, normalizeRole } from "@/lib/auth/roles"

describe("roles", () => {
  it("normalizes owner role aliases", () => {
    expect(normalizeRole("admin")).toBe("owner")
    expect(normalizeRole("org:owner")).toBe("owner")
  })

  it("normalizes staff role aliases", () => {
    expect(normalizeRole("staff")).toBe("staff")
    expect(normalizeRole("pharmacist")).toBe("staff")
  })

  it("normalizes restricted role aliases", () => {
    expect(normalizeRole("restricted")).toBe("restricted")
    expect(normalizeRole("viewer")).toBe("restricted")
  })

  it("restricts view and manage permissions", () => {
    expect(canViewModule("staff", "ventes")).toBe(true)
    expect(canManageModule("staff", "ventes")).toBe(true)
    expect(canViewModule("restricted", "ventes")).toBe(false)
    expect(canManageModule("restricted", "ventes")).toBe(false)
  })

  it("returns all modules", () => {
    expect(getAllModules()).toContain("dashboard")
    expect(getAllModules()).toContain("assistance")
  })
})
