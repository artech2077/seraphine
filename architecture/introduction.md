# Introduction

This document defines the fullstack architecture for Seraphine, unifying the Next.js App Router frontend, Convex data layer, and supporting services into a single source of truth for AI-assisted development. It explains how the POS barcode workflow, AI-generated insights pipeline, and reporting surfaces cooperate across the stack so every AI or human contributor can reason about the same constraints. The guidance emphasizes rapid internal pilot iteration, observable deployments on Vercel, and tight feedback cycles around the n8n enrichment workflow while leaving room for future external launches.

## Starter Template or Existing Project

N/A – Greenfield project. We will scaffold from the standard Next.js 14 App Router starter with pnpm workspaces, then layer in Convex, Clerk, Tailwind, and shadcn/ui per the PRD. No legacy repository constraints exist, so the architecture can optimize for the MVP stack from day one.

## Change Log

| Date       | Version | Description                             | Author    |
|------------|---------|-----------------------------------------|-----------|
| 2025-10-28 | 0.1     | Initial fullstack architecture baseline | Architect |
