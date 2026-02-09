"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { useConvex } from "convex/react"

import { api } from "@/convex/_generated/api"

export function usePrefetchRouteData() {
  const { orgId } = useAuth()
  const convex = useConvex()
  const prefetchedRoutesRef = React.useRef<Set<string>>(new Set())

  React.useEffect(() => {
    prefetchedRoutesRef.current.clear()
  }, [orgId])

  return React.useCallback(
    (href: string) => {
      if (!orgId) return
      if (prefetchedRoutesRef.current.has(href)) return

      const tasks: Array<Promise<unknown>> = []

      switch (href) {
        case "/app": {
          tasks.push(convex.query(api.dashboard.getSummary, { clerkOrgId: orgId, now: Date.now() }))
          break
        }
        case "/app/ventes": {
          tasks.push(
            convex.query(api.sales.listByOrgPaginated, {
              clerkOrgId: orgId,
              pagination: { page: 1, pageSize: 20 },
              filters: {
                clients: [],
                sellers: [],
                products: [],
                payments: [],
                discountOnly: false,
              },
            })
          )
          tasks.push(convex.query(api.clients.listByOrg, { clerkOrgId: orgId }))
          tasks.push(convex.query(api.products.listByOrg, { clerkOrgId: orgId }))
          break
        }
        case "/app/produit":
        case "/app/inventaire": {
          tasks.push(
            convex.query(api.products.listByOrgPaginated, {
              clerkOrgId: orgId,
              pagination: { page: 1, pageSize: 20 },
              filters: {
                names: [],
                barcodes: [],
                suppliers: [],
                categories: [],
                stockStatuses: [],
                vatRates: [],
              },
            })
          )
          break
        }
        case "/app/achats": {
          tasks.push(
            convex.query(api.procurement.listByOrgPaginated, {
              clerkOrgId: orgId,
              type: "PURCHASE_ORDER",
              pagination: { page: 1, pageSize: 5 },
              filters: {
                supplierNames: [],
                statuses: [],
                references: [],
                orderFrom: undefined,
                orderTo: undefined,
                dueFrom: undefined,
                dueTo: undefined,
                createdFrom: undefined,
                createdTo: undefined,
              },
            })
          )
          tasks.push(
            convex.query(api.procurement.listByOrgPaginated, {
              clerkOrgId: orgId,
              type: "DELIVERY_NOTE",
              pagination: { page: 1, pageSize: 5 },
              filters: {
                supplierNames: [],
                statuses: [],
                references: [],
                orderFrom: undefined,
                orderTo: undefined,
                dueFrom: undefined,
                dueTo: undefined,
                createdFrom: undefined,
                createdTo: undefined,
              },
            })
          )
          tasks.push(convex.query(api.suppliers.listByOrg, { clerkOrgId: orgId }))
          tasks.push(convex.query(api.products.listByOrg, { clerkOrgId: orgId }))
          break
        }
        case "/app/fournisseurs": {
          tasks.push(
            convex.query(api.suppliers.listByOrgPaginated, {
              clerkOrgId: orgId,
              pagination: { page: 1, pageSize: 20 },
              filters: {
                names: [],
                cities: [],
                balances: [],
              },
            })
          )
          break
        }
        case "/app/clients": {
          tasks.push(
            convex.query(api.clients.listByOrgPaginated, {
              clerkOrgId: orgId,
              pagination: { page: 1, pageSize: 20 },
              filters: {
                names: [],
                cities: [],
                statuses: [],
              },
            })
          )
          break
        }
        case "/app/reconciliation-caisse": {
          tasks.push(convex.query(api.reconciliation.listByOrg, { clerkOrgId: orgId }))
          tasks.push(
            convex.query(api.reconciliation.listByOrgPaginated, {
              clerkOrgId: orgId,
              pagination: { page: 1, pageSize: 5 },
              filters: {
                from: undefined,
                to: undefined,
                status: "Tous",
              },
            })
          )
          break
        }
        default:
          break
      }

      if (tasks.length === 0) return
      prefetchedRoutesRef.current.add(href)
      void Promise.allSettled(tasks)
    },
    [convex, orgId]
  )
}
