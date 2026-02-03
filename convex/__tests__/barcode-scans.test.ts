import { vi } from "vitest"

import { create, latestForUser } from "@/convex/barcodeScans"
import { getHandler, type ConvexHandler } from "@/convex/__tests__/test_utils"

describe("convex/barcodeScans", () => {
  it("creates a scan with normalized barcode", async () => {
    const ctx = {
      auth: {
        getUserIdentity: vi.fn().mockResolvedValue({ orgId: "org-1", subject: "user-1" }),
      },
      db: {
        insert: vi.fn(async () => "scan-1"),
      },
    }

    const handler = getHandler(create) as ConvexHandler<{
      clerkOrgId: string
      barcode: string
      source?: string
    }>

    await handler(ctx, { clerkOrgId: "org-1", barcode: " 1 2 3 ", source: "PHONE" })

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "barcodeScans",
      expect.objectContaining({
        clerkOrgId: "org-1",
        clerkUserId: "user-1",
        barcode: "123",
        source: "PHONE",
      })
    )
  })

  it("returns the latest scan for the current user", async () => {
    const now = 1_000_000
    vi.spyOn(Date, "now").mockReturnValue(now)

    const latest = {
      _id: "scan-1",
      barcode: "456",
      createdAt: now - 1000,
      source: "PHONE",
    }

    const ctx = {
      auth: {
        getUserIdentity: vi.fn().mockResolvedValue({ orgId: "org-1", subject: "user-1" }),
      },
      db: {
        query: vi.fn(() => ({
          withIndex: () => ({
            order: () => ({
              first: async () => latest,
            }),
          }),
        })),
      },
    }

    const handler = getHandler(latestForUser) as ConvexHandler<
      { clerkOrgId: string },
      { _id: string; barcode: string } | null
    >

    const result = await handler(ctx, { clerkOrgId: "org-1" })

    expect(result).toEqual(
      expect.objectContaining({
        _id: "scan-1",
        barcode: "456",
      })
    )

    vi.restoreAllMocks()
  })

  it("ignores stale scans", async () => {
    const now = 1_000_000
    vi.spyOn(Date, "now").mockReturnValue(now)

    const ctx = {
      auth: {
        getUserIdentity: vi.fn().mockResolvedValue({ orgId: "org-1", subject: "user-1" }),
      },
      db: {
        query: vi.fn(() => ({
          withIndex: () => ({
            order: () => ({
              first: async () => ({
                _id: "scan-1",
                barcode: "999",
                createdAt: now - 60_000,
              }),
            }),
          }),
        })),
      },
    }

    const handler = getHandler(latestForUser) as ConvexHandler<
      { clerkOrgId: string },
      { _id: string; barcode: string } | null
    >

    const result = await handler(ctx, { clerkOrgId: "org-1" })

    expect(result).toBeNull()

    vi.restoreAllMocks()
  })
})
