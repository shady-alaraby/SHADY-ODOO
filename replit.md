# OdooLens — Sales Analytics & Visualization Layer

## Overview

Full-stack pnpm workspace monorepo. React+Vite frontend at `/`, Express API at `/api`, PostgreSQL+Drizzle ORM.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite, Recharts, Zustand, next-themes, wouter, shadcn/ui
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, drizzle-zod
- **API codegen**: Orval (from OpenAPI spec — contract-first)
- **Auth**: JWT (`jsonwebtoken` + `bcryptjs`), email-based login

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Artifacts

| Artifact | Path | Purpose |
|---|---|---|
| `artifacts/sales-analytics` | `/` | React+Vite frontend |
| `artifacts/api-server` | `/api` | Express REST API |

## Auth

- Login: `POST /api/auth/login` with `{ email, password }`
- JWT payload fields: `userId`, `role`, `username`
- Frontend reads `user?.userId` (NOT `user?.id`) from parsed JWT

### Demo credentials

| Email | Password | Role |
|---|---|---|
| admin@example.com | admin123 | ADMIN |
| ahmed@example.com | password123 | BD |
| sara@example.com | password123 | TL |
| khalid@example.com | password123 | TL |
| layla@example.com | password123 | TS |
| omar@example.com | password123 | TS |

## Critical Notes

### Orval codegen quirk
After every `codegen` run, `lib/api-zod/src/index.ts` gets reset. The `package.json` codegen script now auto-fixes this by overwriting the file immediately after orval runs. The correct content is always:
```ts
export * from "./generated/api";
```
The `api.schemas.ts` file exists for `api-client-react` but NOT for `api-zod`.

### Auth token wiring
`setAuthTokenGetter(() => localStorage.getItem("token"))` is called at module level in `App.tsx` — this wires JWT bearer auth to all API requests automatically.

### Demo sync
No Odoo credentials needed for demo mode — creates 30 synthetic tickets. Real Odoo requires `ODOO_URL`, `ODOO_DB`, `ODOO_USERNAME`, `ODOO_API_KEY` env vars.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
