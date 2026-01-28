import { renderHook } from "@testing-library/react"
import { vi } from "vitest"
import type { FunctionReference } from "convex/server"

import { useStableQuery } from "@/hooks/use-stable-query"

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}))

const { useQuery } = await import("convex/react")

type TestResult = { count: number }
type TestQuery = FunctionReference<"query"> & { _returnType: TestResult }

describe("useStableQuery", () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockReset()
  })

  it("keeps cached data while fetching", () => {
    let value: TestResult | undefined = { count: 1 }
    vi.mocked(useQuery).mockImplementation(() => value)

    const query = {} as TestQuery
    const { result, rerender } = renderHook(() => useStableQuery(query, { id: 1 }))

    expect(result.current.data).toEqual({ count: 1 })
    expect(result.current.isLoading).toBe(false)

    value = undefined
    rerender()

    expect(result.current.data).toEqual({ count: 1 })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isFetching).toBe(true)
  })

  it("resets cache when args change", () => {
    let value: TestResult | undefined = { count: 1 }
    vi.mocked(useQuery).mockImplementation(() => value)

    const query = {} as TestQuery
    const { result, rerender } = renderHook(({ id }) => useStableQuery(query, { id }), {
      initialProps: { id: 1 },
    })

    expect(result.current.data).toEqual({ count: 1 })

    value = undefined
    rerender({ id: 2 })

    expect(result.current.data).toBeUndefined()
    expect(result.current.isLoading).toBe(true)
  })
})
