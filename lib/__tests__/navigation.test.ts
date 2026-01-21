import { getPageTitle, mainNavItems, utilityNavItems } from "@/lib/constants/navigation"

describe("navigation", () => {
  it("returns default title when missing", () => {
    expect(getPageTitle("/unknown")).toBe("Tableau de bord")
  })

  it("matches main navigation routes", () => {
    const ventes = mainNavItems.find((item) => item.title === "Ventes")
    expect(ventes).toBeDefined()
    expect(getPageTitle(`${ventes?.href}/detail`)).toBe("Ventes")
  })

  it("matches utility navigation routes", () => {
    const settings = utilityNavItems.find((item) => item.title === "Paramètres")
    expect(settings).toBeDefined()
    expect(getPageTitle(settings?.href ?? "")).toBe("Paramètres")
  })
})
