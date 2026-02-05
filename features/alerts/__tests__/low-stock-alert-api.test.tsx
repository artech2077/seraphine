import { renderHook } from "@testing-library/react"
import { vi } from "vitest"

import { useLowStockAlertActions, useLowStockAlertSummary } from "@/features/alerts/api"
import { mockClerkAuth } from "@/tests/mocks/clerk"
import { createMockMutation } from "@/tests/mocks/convex"

vi.mock("@clerk/nextjs", () => ({
  useAuth: vi.fn(),
}))

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}))

const { useAuth } = await import("@clerk/nextjs")
const { useMutation, useQuery } = await import("convex/react")

describe("useLowStockAlertSummary", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(mockClerkAuth({ orgId: "org-1" }))
    vi.mocked(useQuery).mockReset()
  })

  it("returns summary data", () => {
    vi.mocked(useQuery).mockImplementation(() => ({
      count: 2,
      signature: "product-1|product-2",
      hasActiveDraft: false,
      isHandled: false,
    }))

    const { result } = renderHook(() => useLowStockAlertSummary())

    expect(result.current.summary).toEqual(
      expect.objectContaining({
        count: 2,
        signature: "product-1|product-2",
      })
    )
  })
})

describe("useLowStockAlertActions", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(mockClerkAuth({ orgId: "org-1" }))
    vi.mocked(useMutation).mockReset()
  })

  it("creates a low stock draft", async () => {
    const createDraft = createMockMutation()
    const syncDraft = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createDraft)
      .mockImplementationOnce(() => syncDraft)

    const { result } = renderHook(() => useLowStockAlertActions())

    await result.current.createLowStockDraft("supplier-1")

    expect(createDraft).toHaveBeenCalledWith({
      clerkOrgId: "org-1",
      supplierId: "supplier-1",
    })
  })

  it("syncs a low stock draft", async () => {
    const createDraft = createMockMutation()
    const syncDraft = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createDraft)
      .mockImplementationOnce(() => syncDraft)

    const { result } = renderHook(() => useLowStockAlertActions())

    await result.current.syncLowStockDraft("order-1")

    expect(syncDraft).toHaveBeenCalledWith({
      clerkOrgId: "org-1",
      orderId: "order-1",
    })
  })
})
