import type { FunctionReference } from "convex/server"
import type { ReactMutation } from "convex/react"

export function createMockMutation() {
  const mutation = vi.fn() as ReturnType<typeof vi.fn> &
    ReactMutation<FunctionReference<"mutation">>
  mutation.withOptimisticUpdate = vi.fn(() => mutation)
  return mutation
}
