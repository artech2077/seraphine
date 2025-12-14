"use client"

import * as React from "react"

export function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`)

    const update = () => setIsMobile(mediaQuery.matches)
    update()

    mediaQuery.addEventListener("change", update)
    return () => mediaQuery.removeEventListener("change", update)
  }, [breakpoint])

  return isMobile
}
