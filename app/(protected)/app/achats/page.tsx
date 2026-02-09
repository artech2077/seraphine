import { Suspense } from "react"

import { AchatsPage } from "@/features/achats/achats-page"

export const metadata = {
  title: "Seraphine - Achats",
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AchatsPage />
    </Suspense>
  )
}
