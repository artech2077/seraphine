# Frontend Architecture

## Component Organization

```text
apps/web/src/
├─ app/
│  ├─ layout.tsx                # Root layout w/ ClerkProvider, ThemeProvider
│  ├─ page.tsx                  # Dashboard landing (Owner)
│  ├─ pos/
│  │  ├─ page.tsx               # POS shell (Pilot default)
│  │  └─ components/
│  │     ├─ scan-pane.tsx
│  │     ├─ tender-summary.tsx
│  │     └─ scanner-status.tsx
│  ├─ sales-log/
│  │  ├─ page.tsx
│  │  └─ components/
│  │     └─ sales-table.tsx
│  ├─ settings/
│  │  ├─ layout.tsx
│  │  ├─ catalog/page.tsx
│  │  ├─ feedback/page.tsx
│  │  └─ components/
│  │     └─ product-form.tsx
│  └─ api/
│     └─ reports/route.ts       # Streaming report endpoint
├─ components/ui/               # Shared shadcn wrappers
├─ components/modules/          # Dashboard widgets, navigation shell
├─ hooks/                       # Convex queries, keyboard handlers
├─ stores/                      # Zustand stores (POS session)
├─ lib/                         # Auth helpers, analytics, server utilities
├─ styles/                      # Tailwind globals + tokens
└─ tests/                       # Vitest + Testing Library suites
```

## Component Template

```typescript
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

type InsightCardProps = {
  title: string;
  details: string;
  generatedAt: string;
  confidence?: number;
};

export function InsightCard({ title, details, generatedAt, confidence }: InsightCardProps) {
  const freshness = formatDistanceToNow(new Date(generatedAt), { addSuffix: true });
  return (
    <Card data-confidence={confidence ?? "n/a"}>
      <CardHeader className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">{freshness}</span>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">{details}</p>
        {confidence !== undefined && (
          <span className="inline-flex items-center rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            Confiance {(confidence * 100).toFixed(0)}%
          </span>
        )}
      </CardContent>
    </Card>
  );
}
```

## State Management

```typescript
import { create } from "zustand";

type TenderMethod = "cash" | "card" | "other";

type PosItem = {
  productId: string;
  barcode: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
};

type PosSessionState = {
  items: PosItem[];
  tender: { method: TenderMethod; amountCents: number; notes?: string };
  scannerReady: boolean;
  offlineQueue: PosItem[][];
  setScannerReady: (ready: boolean) => void;
  addItem: (item: PosItem) => void;
  updateTender: (update: Partial<PosSessionState["tender"]>) => void;
  reset: () => void;
  enqueueOffline: (items: PosItem[]) => void;
};

export const usePosSession = create<PosSessionState>((set) => ({
  items: [],
  tender: { method: "cash", amountCents: 0 },
  scannerReady: true,
  offlineQueue: [],
  setScannerReady: (ready) => set({ scannerReady: ready }),
  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item],
      tender: {
        ...state.tender,
        amountCents: state.tender.amountCents + item.unitPriceCents * item.quantity,
      },
    })),
  updateTender: (update) => set((state) => ({ tender: { ...state.tender, ...update } })),
  reset: () => set({ items: [], tender: { method: "cash", amountCents: 0 } }),
  enqueueOffline: (items) =>
    set((state) => ({ offlineQueue: [...state.offlineQueue, items], scannerReady: false })),
}));
```

Patterns:
- Prefer Convex React hooks for all server state; never mirror Convex collections in Zustand.
- Limit Zustand usage to transient POS session/tender state and offline queues; reset after successful mutation.
- Wrap keyboard handlers with `useEffect` cleanup to keep scanner listeners deterministic.
- Expose selectors (`usePosSession((s) => s.items.length)`) to avoid unnecessary re-renders.
- Responsive approach: Desktop-first layouts with Tailwind breakpoints (`md`, `lg`) covering tablet/monitor usage; critical flows maintain keyboard-only accessibility and scale down to 1280px without horizontal scroll.
- Image handling: Leverage Next.js `<Image>` with Vercel optimization for logos/illustrations; POS scanner diagnostics use icon sprites to minimize network weight. Non-critical imagery is conditionally loaded on interaction.
- Accessibility: shadcn/ui components map to semantic HTML (Radix primitives) with enforced WCAG 2.1 AA contrast; focus outlines remain enabled; keyboard shortcuts documented in POS module (scan input auto-focus, manual search via Ctrl+K).
- ARIA & Announcements: dynamic components provide `aria-live` regions for scanner success/error toasts and include descriptive `aria-label`/`aria-describedby` props through shared helpers.
- Focus Management: dialogs and toasts reuse shadcn focus traps; closing actions always return focus to the invoker (e.g., last scanned item button).
- Screen Reader Support: dashboard insight cards expose heading levels and list semantics; POS scanner status uses `role="status"` for real-time updates.
- Offline Queue Guardrails: queue capped at 50 pending sales; excess entries trigger warning toast and Logtail metric so operators sync or pause activity.

## Routing Architecture

```text
/app
├─ page.tsx                      # Dashboard (role-aware landing)
/app/pos/page.tsx                # POS workflow
/app/sales-log/page.tsx          # Sales log + filters
/app/settings/layout.tsx         # Settings shell with tabs
/app/settings/catalog/page.tsx   # Product management
/app/settings/feedback/page.tsx  # Feedback overview
/app/api/reports/route.ts        # Streaming report handler
```

Protected routes use `(authenticated)` groups with Clerk server-side validation.

## Protected Route Pattern

```typescript
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PropsWithChildren } from "react";

export default async function AuthenticatedLayout({ children }: PropsWithChildren) {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const role = user.publicMetadata.role as "owner" | "pilotTester" | undefined;
  if (!role) {
    redirect("/request-access");
  }

  return <div className="min-h-screen bg-background">{children}</div>;
}
```

## Frontend Services Layer

```typescript
import { ConvexReactClient } from "convex/react";
import { api } from "@seraphine/convex/_generated/api";

declare global {
  interface Window {
    __convexClient?: ConvexReactClient<typeof api>;
  }
}

export const convex = (() => {
  if (typeof window === "undefined") {
    return new ConvexReactClient<typeof api>(process.env.NEXT_PUBLIC_CONVEX_URL!);
  }
  if (!window.__convexClient) {
    window.__convexClient = new ConvexReactClient<typeof api>(
      process.env.NEXT_PUBLIC_CONVEX_URL!
    );
  }
  return window.__convexClient;
})();
```

```typescript
"use server";

import { api } from "@seraphine/convex/_generated/api";
import { convexServerAction } from "@/lib/convex-server";
import { revalidateTag } from "next/cache";

type CreateSaleInput = {
  items: Array<{ productId: string; quantity: number; unitPriceCents: number; barcode: string; name: string }>;
  tender: { method: "cash" | "card" | "other"; amountCents: number; notes?: string };
  feedbackOptIn: boolean;
};

export async function createSale(input: CreateSaleInput) {
  const result = await convexServerAction(api.sales.createSale, input);
  revalidateTag("dashboard-insights");
  revalidateTag("sales-log");
  return result;
}
```
