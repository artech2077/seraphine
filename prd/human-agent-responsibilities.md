# Human & Agent Responsibilities

| Responsibility | Owner (Human) | Supporting Agent Tasks |
| -------------- | ------------- | ---------------------- |
| Vendor onboarding (GitHub, Vercel, Clerk, Convex, n8n) | Product Ops / Tech Lead creates accounts, manages billing, and grants access | Agents request credentials via documented intake template; no agent creates accounts or handles billing |
| Secrets management & rotation | Tech Lead maintains Vercel env vars and Convex/Clerk tokens | Agents update `.env.example`, CI references, and ensure secrets are consumed from runtime env only |
| Pilot data preparation for n8n | Founding team curates data exports and mapping rules | Agents document required formats and validate ingestion results inside Convex |
| POS hardware setup (barcode scanners) | Operations lead procures and configures USB scanners for test sites | Agents supply compatibility checklist and in-app scanner diagnostics |
| Internal training & feedback loop | Product team coordinates pilot sessions and collects feedback | Agents implement in-product feedback capture and surface aggregated results |

**Guiding Principles**
- Build only what is essential for the internal pilot while keeping the architecture ready for future expansion.
- Treat n8n outputs as read-only AI insights; transactional integrity lives inside Next.js and Convex.
- Default to automation for deployments and testing to avoid manual drift.
- Keep all copy and UI states French-first where applicable, but prioritize shipping the workflow over exhaustive localization.
