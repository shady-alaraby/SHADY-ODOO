# OdooLens — Sales Analytics & Visualization Layer

## Overview

Full-stack pnpm workspace monorepo. React+Vite frontend at `/`, Express API at `/api`, PostgreSQL+Drizzle ORM.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite, Recharts, Zustand, next-themes, wouter, shadcn/ui, Cairo/Inter fonts
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, drizzle-zod
- **API codegen**: Orval (from OpenAPI spec — contract-first)
- **Auth**: JWT (`jsonwebtoken` + `bcryptjs`), email-based login
- **i18n**: Custom React context, Arabic (RTL default) + English

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

## Theme

**Dark mode (default):** Black/dark navy background, gold (`hsl(43,74%,49%)`) as primary color, glassmorphism cards, gold glow effects, neon chart colors.

**Light mode:** White/cream background, darker gold, high contrast.

**Font:** Cairo (Arabic + Latin) + Inter as fallback.

## i18n

- Default: Arabic RTL
- Toggle: Language switcher in sidebar and on login page
- Files: `artifacts/sales-analytics/src/i18n/ar.ts`, `en.ts`, `index.tsx`
- Hook: `useI18n()` — provides `{ t, lang, setLang, isRTL }`

## Auth

- Login: `POST /api/auth/login` with `{ email, password }`
- JWT payload fields: `userId`, `role`, `username`
- Frontend reads `user?.userId` (NOT `user?.id`) from parsed JWT

## Team Hierarchy (36 users)

4 Business Developers → 2 Team Leaders each → 2-4 Employees each

**Business Developers:**
- أشرف عصمت → ashraf@example.com
- حسام حامد → hussam.hamid@example.com
- شادي العربي → shadi@example.com
- مجاهد الأمين → mujahid@example.com

**Admin:** admin@example.com / admin123

**All other users:** password123

## Pages

| Route | Page | Description |
|---|---|---|
| `/` | → `/dashboard` | Redirect |
| `/dashboard` | Dashboard | Gold KPI cards, animated counters, charts |
| `/tickets` | Tickets | Table + Kanban board |
| `/hierarchy` | Team Hierarchy | Expandable org chart tree |
| `/users` | Users | Card grid with BD/role filters |
| `/mapping` | Odoo Mapping | Salesperson name mapping |
| `/sync` | Sync Status | Odoo sync logs |
| `/settings` | Settings | App settings |

## Critical Notes

### Orval codegen quirk
After every `codegen` run, `lib/api-zod/src/index.ts` gets reset. The `package.json` codegen script now auto-fixes this by overwriting the file immediately after orval runs. Correct content:
```ts
export * from "./generated/api";
```

### Auth token wiring
`setAuthTokenGetter(() => localStorage.getItem("token"))` is called at module level in `App.tsx` — this wires JWT bearer auth to all API requests automatically.

### Demo sync
No Odoo credentials needed for demo mode — creates 30 synthetic tickets. Real Odoo requires `ODOO_URL`, `ODOO_DB`, `ODOO_USERNAME`, `ODOO_API_KEY` env vars.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
