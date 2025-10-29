# Testing Strategy

```
E2E Tests
/        \
Integration Tests
/            \
Frontend Unit  Backend Unit
```

**Frontend Tests**

```
apps/web/tests/
├─ unit/
├─ integration/
└─ fixtures/
```

**Backend Tests**

```
packages/convex/tests/
├─ unit/
├─ integration/
└─ helpers/
```

**E2E Tests**

```
apps/web/tests-e2e/
├─ dashboard.spec.ts
├─ pos-barcode-flow.spec.ts
├─ sales-log-export.spec.ts
└─ fixtures/
```

**Accessibility Tests**

- `pnpm test:a11y` runs Storybook axe checks via `@storybook/addon-a11y` against critical components (insight cards, POS dialogs) with WCAG 2.1 AA expectations.
- Playwright suites call `await expect(page).toPassAxe()` on dashboard/POS screens to guard against regressions.
- Release checklist includes manual VoiceOver + keyboard-only walkthrough on dashboard, POS, and report export flows.

Example component test:

```typescript
import { render, screen } from "@testing-library/react";
import { InsightCard } from "@/components/modules/insight-card";

describe("InsightCard", () => {
  it("renders freshness badge and confidence", () => {
    render(
      <InsightCard
        title="Cash variance +MAD 420"
        details="Variance driven by late card settlement."
        generatedAt="2025-10-28T05:00:00.000Z"
        confidence={0.82}
      />
    );

    expect(screen.getByText(/Cash variance/)).toBeInTheDocument();
    expect(screen.getByText(/Confiance 82%/)).toBeVisible();
  });
});
```

Example Playwright E2E:

```typescript
import { test, expect } from "@playwright/test";

test.use({ storageState: "fixtures/auth.storageState.json" });

test("pilot operator completes barcode sale", async ({ page }) => {
  await page.goto("/pos");
  await page.locator('[data-testid="scanner-input"]').fill("735009513016");
  await expect(page.getByText("Seraphine Cough Syrup")).toBeVisible();
  await page.getByRole("button", { name: "Confirmer la vente" }).click();
  await expect(page.getByText("Vente enregistrée")).toBeVisible();
});
```
