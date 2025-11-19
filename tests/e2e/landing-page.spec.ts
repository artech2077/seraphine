import { test, expect } from "@playwright/test"

test.describe("Landing page", () => {
  test("shows authentication CTAs when signed out", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByRole("heading", { name: "Seraphine" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Créer un compte" })).toBeVisible()
  })
})
