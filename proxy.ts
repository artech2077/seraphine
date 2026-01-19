import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { canViewModule, normalizeRole, type ModuleKey } from "@/lib/auth/roles"

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"])
const isOrgManagementRoute = createRouteMatcher(["/app/parametres(.*)"])
const isAccountRoute = createRouteMatcher(["/app/account(.*)"])

const moduleRoutes: Array<{ prefix: string; module: ModuleKey }> = [
  { prefix: "/app/ventes", module: "ventes" },
  { prefix: "/app/inventaire", module: "inventaire" },
  { prefix: "/app/achats", module: "achats" },
  { prefix: "/app/fournisseurs", module: "fournisseurs" },
  { prefix: "/app/clients", module: "clients" },
  { prefix: "/app/reconciliation-caisse", module: "reconciliation" },
  { prefix: "/app/rapports", module: "rapports" },
  { prefix: "/app/analytique", module: "analytique" },
  { prefix: "/app/parametres", module: "parametres" },
  { prefix: "/app/assistance", module: "assistance" },
]

function getModuleForPath(pathname: string): ModuleKey | null {
  if (pathname === "/app") return "dashboard"
  const match = moduleRoutes.find((route) => pathname.startsWith(route.prefix))
  return match?.module ?? null
}

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  const authState = await auth()

  if (!authState.userId) {
    await auth.protect()
    return NextResponse.next()
  }

  if (!authState.orgId && !isOrgManagementRoute(req)) {
    const url = new URL("/app/parametres", req.url)
    url.searchParams.set("tab", "pharmacies")
    return NextResponse.redirect(url)
  }

  if (authState.orgId && !isAccountRoute(req)) {
    const role = normalizeRole(authState.orgRole)
    const moduleKey = getModuleForPath(req.nextUrl.pathname)
    if (moduleKey && !canViewModule(role, moduleKey)) {
      const fallbackPath =
        role === "restricted" ? "/app/parametres" : role === "staff" ? "/app/ventes" : "/app"
      return NextResponse.redirect(new URL(fallbackPath, req.url))
    }
    if (req.nextUrl.pathname === "/app") {
      if (role === "restricted") {
        return NextResponse.redirect(new URL("/app/parametres", req.url))
      }
      if (role === "staff") {
        return NextResponse.redirect(new URL("/app/ventes", req.url))
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}
