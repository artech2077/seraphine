"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser"

import { api } from "@/convex/_generated/api"
import { useMutation } from "convex/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { normalizeBarcode } from "@/lib/barcode"

type ScannerStatus = "idle" | "ready" | "error"

const DUPLICATE_WINDOW_MS = 1500

export function PhoneScannerClient() {
  const { orgId, userId } = useAuth()
  const createScan = useMutation(api.barcodeScans.create)
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const controlsRef = React.useRef<IScannerControls | null>(null)
  const readerRef = React.useRef<BrowserMultiFormatReader | null>(null)
  const lastScanRef = React.useRef<{ barcode: string; time: number } | null>(null)

  const [status, setStatus] = React.useState<ScannerStatus>("idle")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [lastResult, setLastResult] = React.useState<string | null>(null)

  const sendScan = React.useCallback(
    async (value: string) => {
      if (!orgId || !userId) return
      const normalized = normalizeBarcode(value)
      if (!normalized) return
      const now = Date.now()
      if (
        lastScanRef.current &&
        lastScanRef.current.barcode === normalized &&
        now - lastScanRef.current.time < DUPLICATE_WINDOW_MS
      ) {
        return
      }
      lastScanRef.current = { barcode: normalized, time: now }
      setLastResult(normalized)
      await createScan({ clerkOrgId: orgId, barcode: normalized, source: "PHONE" })
    },
    [createScan, orgId, userId]
  )

  const startScanner = React.useCallback(async () => {
    if (!orgId || !userId) return
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error")
      setErrorMessage("La caméra n'est pas disponible sur cet appareil.")
      return
    }
    setStatus("idle")
    setErrorMessage(null)
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    try {
      const videoElement = videoRef.current
      if (!videoElement) return
      const controls = await reader.decodeFromVideoDevice(undefined, videoElement, (result) => {
        if (result) {
          void sendScan(result.getText())
        }
      })
      controlsRef.current = controls
      setStatus("ready")
    } catch (error) {
      setStatus("error")
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'accéder à la caméra. Vérifiez les permissions."
      )
    }
  }, [orgId, sendScan, userId])

  React.useEffect(() => {
    void startScanner()
    return () => {
      controlsRef.current?.stop()
      controlsRef.current = null
      readerRef.current = null
    }
  }, [startScanner])

  if (!orgId || !userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scanner mobile</CardTitle>
          <CardDescription>Connectez-vous pour activer le scanner.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Scanner mobile</CardTitle>
            <CardDescription>
              Scannez un code barre. Il sera envoyé automatiquement au poste connecté.
            </CardDescription>
          </div>
          <Badge variant={status === "ready" ? "default" : "secondary"}>
            {status === "ready" ? "Prêt" : status === "error" ? "Erreur" : "Initialisation"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-hidden rounded-lg border border-border bg-muted">
          <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
        </div>
        {errorMessage ? (
          <div className="space-y-2 text-sm text-destructive">
            <p>{errorMessage}</p>
            <Button variant="outline" onClick={() => void startScanner()}>
              Réessayer
            </Button>
          </div>
        ) : null}
        {lastResult ? (
          <div className="text-xs text-muted-foreground">Dernier scan : {lastResult}</div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Alignez le code barre devant la caméra.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
