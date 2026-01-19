export type Role = "owner" | "staff" | "restricted" | "unknown"

export type ModuleKey =
  | "dashboard"
  | "ventes"
  | "inventaire"
  | "achats"
  | "fournisseurs"
  | "clients"
  | "reconciliation"
  | "rapports"
  | "analytique"
  | "parametres"
  | "assistance"

const allModules: ModuleKey[] = [
  "dashboard",
  "ventes",
  "inventaire",
  "achats",
  "fournisseurs",
  "clients",
  "reconciliation",
  "rapports",
  "analytique",
  "parametres",
  "assistance",
]

const staffViewModules = new Set<ModuleKey>([
  "ventes",
  "inventaire",
  "achats",
  "parametres",
  "assistance",
])
const restrictedViewModules = new Set<ModuleKey>(["parametres", "assistance"])
const staffManageModules = new Set<ModuleKey>(["ventes", "inventaire", "achats"])

export function normalizeRole(orgRole?: string | null): Role {
  if (!orgRole) return "unknown"
  const normalized = orgRole.toLowerCase().split(":").pop() ?? orgRole.toLowerCase()

  if (normalized === "admin" || normalized.includes("owner")) {
    return "owner"
  }
  if (
    normalized === "member" ||
    normalized.includes("staff") ||
    normalized.includes("pharmacist")
  ) {
    return "staff"
  }
  if (normalized === "restricted" || normalized.includes("viewer") || normalized.includes("read")) {
    return "restricted"
  }

  return "unknown"
}

export function canViewModule(role: Role, module: ModuleKey) {
  if (role === "owner") return true
  if (role === "restricted") return restrictedViewModules.has(module)
  if (role === "staff") return staffViewModules.has(module)
  return false
}

export function canManageModule(role: Role, module: ModuleKey) {
  if (role === "owner") return true
  if (role === "staff") return staffManageModules.has(module)
  return false
}

export function getAllModules() {
  return allModules
}
