export type ConvexHandler<Args, Result = unknown> = (ctx: unknown, args: Args) => Promise<Result>

export function getHandler(fn: unknown) {
  const maybe = fn as { _handler?: unknown; handler?: unknown }
  return (maybe._handler ?? maybe.handler ?? fn) as unknown
}
