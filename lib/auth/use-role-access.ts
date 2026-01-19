"use client"

import { useAuth } from "@clerk/nextjs"

import { canManageModule, canViewModule, normalizeRole, type ModuleKey } from "@/lib/auth/roles"

export function useRoleAccess() {
  const { orgId, orgRole } = useAuth()
  const role = normalizeRole(orgRole ?? null)

  const allowOrgManagement = role === "owner" || !orgId

  return {
    role,
    orgId,
    isOwner: role === "owner",
    isStaff: role === "staff",
    isRestricted: role === "restricted",
    canView: (module: ModuleKey) => canViewModule(role, module),
    canManage: (module: ModuleKey) => canManageModule(role, module),
    canManageSettings: allowOrgManagement,
  }
}
