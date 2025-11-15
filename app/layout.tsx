import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { frFR } from "@clerk/localizations"
import { Geist, Geist_Mono } from "next/font/google"

import { SiteHeader } from "@/components/site-header"

import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Seraphine",
  description: "Plateforme moderne de gestion pharmaceutique",
}

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
const proxyUrl = process.env.NEXT_PUBLIC_CLERK_PROXY_URL

if (!publishableKey) {
  throw new Error("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set")
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider
      localization={frFR}
      publishableKey={publishableKey}
      proxyUrl={proxyUrl}
      afterSignOutUrl="/"
      appearance={{
        layout: {
          socialButtonsVariant: "iconButton",
        },
      }}
    >
      <html lang="fr">
        <body className={`${geistSans.variable} ${geistMono.variable} bg-background antialiased`}>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
          </div>
        </body>
      </html>
    </ClerkProvider>
  )
}
