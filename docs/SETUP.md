# Setup

## Prerequisites

- Node.js 20+
- pnpm

## Install

```bash
pnpm install
```

## Environment

```bash
cp .env.local.example .env.local
```

Fill in your Clerk and Convex values in `.env.local`.
Set `NEXT_PUBLIC_APP_ENV=development` for local development.

## Run

```bash
pnpm dev
```

## Config

Update app metadata (name, locale, VAT defaults) in `config/app.ts`.
