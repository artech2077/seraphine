# Coding Standards

- **Single Source Of Schemas:** All domain types and validation schemas live in `packages/shared`; never redefine interfaces inside apps or Convex files.
- **Convex Access Only via Generated Client:** Frontend/server actions must call Convex through `@seraphine/convex/_generated/api`; do not hit HTTPS endpoints directly.
- **Clerk Role Checks:** Always use `requireRole` helper in Convex and `currentUser` metadata server-side; never trust client-provided roles.
- **POS Scanner Stability:** Keyboard listeners must attach/detach inside `useEffect`; remove on unmount to avoid double scans.
- **Insight Rendering:** Treat AI insight content as untrusted—sanitize markdown and avoid raw HTML injection.
- **Report Generation:** Stream CSV/PDF from server actions; never generate sensitive reports client-side.

| Element         | Frontend             | Backend | Example                     |
|-----------------|----------------------+--------|-----------------------------|
| Components      | PascalCase           | -      | `DashboardSummary.tsx`      |
| Hooks           | camelCase with `use` | -      | `usePosSession.ts`          |
| API Routes      | -                    | kebab-case | `/api/reports`           |
| Database Tables | -                    | lowercase (Convex ids) | `sales`, `products` |
