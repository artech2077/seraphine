import { renderHook, waitFor } from "@testing-library/react"
import { vi } from "vitest"

import { useStocktakeSessions } from "@/features/inventaire/api"
import { mockClerkAuth } from "@/tests/mocks/clerk"
import { createMockMutation } from "@/tests/mocks/convex"

vi.mock("@clerk/nextjs", () => ({
  useAuth: vi.fn(),
}))

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
  useConvex: vi.fn(),
}))

const { useAuth } = await import("@clerk/nextjs")
const { useConvex, useMutation, useQuery } = await import("convex/react")

describe("useStocktakeSessions", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(mockClerkAuth({ orgId: "org-1" }))
    vi.mocked(useConvex).mockReset()
    vi.mocked(useMutation).mockReset()
    vi.mocked(useQuery).mockReset()
  })

  it("maps sessions and selected session payloads", async () => {
    const createSession = createMockMutation()
    vi.mocked(useMutation).mockImplementation(() => createSession)
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: "stocktake-1",
          name: "Comptage Hebdo",
          status: "COUNTING",
          createdAt: 100,
          startedAt: 120,
          finalizedAt: null,
          itemsCount: 2,
          countedCount: 1,
          varianceCount: 0,
        },
      ])
      .mockResolvedValueOnce({
        id: "stocktake-1",
        name: "Comptage Hebdo",
        status: "COUNTING",
        createdAt: 100,
        startedAt: 120,
        finalizedAt: null,
        items: [
          {
            id: "item-1",
            productId: "product-1",
            productName: "Doliprane",
            expectedQuantity: 10,
            countedQuantity: 9,
            varianceQuantity: -1,
            note: "Ecart",
          },
        ],
      })

    vi.mocked(useConvex).mockReturnValue({ query })

    const { result } = renderHook(() => useStocktakeSessions("stocktake-1"))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.sessions).toEqual([
      expect.objectContaining({
        id: "stocktake-1",
        status: "COUNTING",
      }),
    ])
    expect(result.current.selectedSession).toEqual(
      expect.objectContaining({
        id: "stocktake-1",
        items: expect.arrayContaining([
          expect.objectContaining({
            productId: "product-1",
            expectedQuantity: 10,
          }),
        ]),
      })
    )
    expect(query).toHaveBeenCalledTimes(2)
  })

  it("passes finalize payload to convex mutation", async () => {
    const finalizeSession = createMockMutation()
    vi.mocked(useMutation).mockImplementation(() => finalizeSession)
    const query = vi.fn().mockResolvedValue([])

    vi.mocked(useConvex).mockReturnValue({ query })

    const { result } = renderHook(() => useStocktakeSessions("stocktake-1"))
    await waitFor(() => expect(query).toHaveBeenCalled())

    await result.current.finalizeSession("stocktake-1", [
      {
        productId: "product-1",
        countedQuantity: 7,
        note: "Boite perdue",
      },
    ])

    expect(finalizeSession).toHaveBeenCalledWith({
      clerkOrgId: "org-1",
      id: "stocktake-1",
      counts: [
        {
          productId: "product-1",
          countedQuantity: 7,
          note: "Boite perdue",
        },
      ],
    })
  })

  it("returns fallback state when stocktake functions are not deployed", async () => {
    const createSession = createMockMutation()
    vi.mocked(useMutation).mockImplementation(() => createSession)
    const query = vi.fn().mockRejectedValue(new Error("Could not find public function"))

    vi.mocked(useConvex).mockReturnValue({ query })

    const { result } = renderHook(() => useStocktakeSessions("stocktake-1"))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.sessions).toEqual([])
    expect(result.current.selectedSession).toBeNull()
    expect(result.current.isUnavailable).toBe(true)
  })
})
