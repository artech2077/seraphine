import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import type { AppEnvironment } from "@/lib/env/public"

type QaBannerProps = {
  environment: AppEnvironment
}

export function QaBanner({ environment }: QaBannerProps) {
  if (environment !== "qa") {
    return null
  }

  return (
    <Alert className="rounded-none border-0 border-b border-border">
      <AlertTitle className="flex items-center gap-2">
        <Badge variant="warning">QA</Badge>
        QA environment
      </AlertTitle>
      <AlertDescription>
        You are viewing the QA environment. Data and configuration are isolated from production.
      </AlertDescription>
    </Alert>
  )
}
