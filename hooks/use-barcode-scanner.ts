"use client"

import * as React from "react"

import { api } from "@/convex/_generated/api"
import { normalizeBarcode } from "@/lib/barcode"
import { useStableQuery } from "@/hooks/use-stable-query"

type UseBarcodeScannerOptions = {
  clerkOrgId?: string | null
  enabled?: boolean
  onScan: (barcode: string) => void
}

const SCAN_MIN_LENGTH = 4
const SCAN_MAX_GAP_MS = 60
const SCAN_END_GAP_MS = 120
const SCAN_DUPLICATE_WINDOW_MS = 800

export function useBarcodeScanner({
  clerkOrgId,
  enabled = true,
  onScan,
}: UseBarcodeScannerOptions) {
  const lastKeyTimeRef = React.useRef(0)
  const bufferRef = React.useRef("")
  const lastScanRef = React.useRef<{ barcode: string; time: number } | null>(null)
  const lastRemoteScanIdRef = React.useRef<string | null>(null)

  const emitScan = React.useCallback(
    (rawBarcode: string) => {
      const normalized = normalizeBarcode(rawBarcode)
      if (!normalized) return
      const now = Date.now()
      if (
        lastScanRef.current &&
        lastScanRef.current.barcode === normalized &&
        now - lastScanRef.current.time < SCAN_DUPLICATE_WINDOW_MS
      ) {
        return
      }
      lastScanRef.current = { barcode: normalized, time: now }
      onScan(normalized)
    },
    [onScan]
  )

  React.useLayoutEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return

      if (event.key === "Enter") {
        const now = Date.now()
        if (
          bufferRef.current.length >= SCAN_MIN_LENGTH &&
          now - lastKeyTimeRef.current <= SCAN_END_GAP_MS
        ) {
          emitScan(bufferRef.current)
        }
        bufferRef.current = ""
        return
      }

      if (event.key.length !== 1) return

      const now = Date.now()
      if (now - lastKeyTimeRef.current > SCAN_MAX_GAP_MS) {
        bufferRef.current = event.key
      } else {
        bufferRef.current += event.key
      }
      lastKeyTimeRef.current = now
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [emitScan, enabled])

  const latestScanQuery = useStableQuery(
    api.barcodeScans.latestForUser,
    clerkOrgId && enabled ? { clerkOrgId } : "skip"
  )
  const latestScan = latestScanQuery.data

  React.useEffect(() => {
    if (!latestScan) return
    if (lastRemoteScanIdRef.current === latestScan._id) return
    lastRemoteScanIdRef.current = latestScan._id
    emitScan(latestScan.barcode)
  }, [emitScan, latestScan])
}
