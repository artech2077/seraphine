# Seraphine – Roadmap

A living plan that tracks what’s delivered and what’s coming next for the MVP.

1. [x] **MVP web app (Next.js + Tailwind)** — Dashboard, sales, inventory, clients, suppliers, cash reconciliation, forecasting, and onboarding in French as defined in the PRD.
2. [x] **Supabase integration** — Environment-driven connection, initial SQL schema, demo fallbacks, and forms writing to the database.
3. [x] **Inventory import & demo data** — CSV template provided, products linked to the demo pharmacy, and real-time display in the UI.
4. [x] **Setup documentation** — `docs/SETUP.md` covering Node, Supabase, Clerk, and initial deployment instructions.
5. [x] **Clerk authentication** — Built-in Sign-in/Sign-up routes, middleware protection, and user button in the interface.
6. [x] **Link Clerk accounts to Supabase users** — Persist `clerk_id`, differentiate owner vs. staff via Clerk Organizations, and prepare team onboarding.
7. [x] **Enable Row Level Security (RLS)** — Supabase policies to isolate data per pharmacy and secure APIs.
8. [x] **Handle sale line items (`sale_items`)** — Dynamic multi-produit sale form wired to Supabase RPC (`create_sale_with_items`) that records `sale_items`, logs inventory movements, and décrémente les stocks automatiquement.
9. [x] **Automate historical fields** — Triggers for `last_purchase`, `last_delivery`, and balance calculations.
10. [ ] **Production deployment (Vercel)** — Push repo, run `next build`, configure env vars, and smoke-test production.
11. [ ] **Advanced analytics & exports** — Additional reports (margin, top suppliers), Excel/BI exports, and configurable alerts.

## 📝 Notes
- Keep this roadmap evolving: add target dates, owners, or status details as work progresses.
- When an item ships, move it to “Completed” with the delivery date and, ideally, a link to the related PR.
