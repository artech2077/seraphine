"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import type { OptionalRestArgsOrSkip } from "convex/react"
import type { FunctionReference } from "convex/server"

export type StableQueryResult<T> = {
  data: T | undefined
  isLoading: boolean
  isFetching: boolean
}

export function useStableQuery<Query extends FunctionReference<"query">>(
  query: Query,
  ...args: OptionalRestArgsOrSkip<Query>
): StableQueryResult<Query["_returnType"]> {
  const result = useQuery(query, ...args)
  const [cached, setCached] = React.useState<Query["_returnType"] | undefined>(result)
  const argsKey = JSON.stringify(args)
  const lastArgsKeyRef = React.useRef(argsKey)
  const isNewArgs = lastArgsKeyRef.current !== argsKey

  if (isNewArgs) {
    lastArgsKeyRef.current = argsKey
  }

  React.useEffect(() => {
    if (args[0] === "skip") {
      setCached(undefined)
      return
    }
    if (result !== undefined) {
      setCached(result)
    } else if (isNewArgs) {
      setCached(undefined)
    }
  }, [args, isNewArgs, result])

  const data = result === undefined ? (isNewArgs ? undefined : cached) : result

  return {
    data,
    isLoading: data === undefined,
    isFetching: result === undefined && data !== undefined,
  }
}
