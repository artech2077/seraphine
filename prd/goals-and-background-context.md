# Goals and Background Context

## Goals
- Deliver a lean internal pilot that demonstrates barcode-first POS capture and real-time cash visibility using the target stack.
- Validate AI-powered operational insights by surfacing n8n-generated recommendations directly inside the product dashboard.
- Stand up the production-grade foundations (repository, deployment automation, secrets, observability) required for rapid iteration without overbuilding non-essential features.

## Background Context
Seraphine previously targeted a full pharmacy operating system in its first release, including forecasting, supplier management, and compliance-heavy workflows. That ambition slowed progress and obscured validation. We are now realigning around a smaller, internal-only MVP that the founding team and trusted partners can test quickly. The product must prove two critical experiences: registering sales via barcode scanning and reviewing AI insights that highlight cash and inventory signals. The stack is standardized on Next.js acting as both frontend and backend, Convex as the datastore, Clerk for authentication, Tailwind CSS with shadcn/ui for design system components, and Vercel for hosting. AI content is produced by an n8n workflow that gathers pilot data, enriches it, and writes structured insights back into Convex for display. No custom domain is required for the MVP.

## Change Log
| Date       | Version | Description                                        | Author |
|------------|---------|----------------------------------------------------|--------|
| 2025-10-23 | 0.2     | Updated stack, MVP scope, and epic structure       | PM     |
| 2025-10-20 | 0.1     | Initial PRD draft kickoff                          | PM     |
