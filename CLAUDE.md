# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Development server at http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run db:seed      # Seed database
npm run db:reset     # Drop and re-seed database
```

## Architecture

### Route Groups
- `app/(app)/` — All authenticated pages (dashboard, events, tickets, bar, guests, promoters, expenses, closing, export, settings)
- `app/api/` — REST API routes, all protected with `getServerSession(authOptions)`
- `app/login/` — Public login page

### Data Flow
1. Client pages fetch from `/api/*` routes
2. API routes use the Prisma singleton from `lib/prisma.ts`
3. Active event is shared across pages via `EventContext` (stored in localStorage)
4. Authentication state comes from NextAuth JWT session

### Key Files
- `lib/prisma.ts` — Prisma singleton using `@prisma/adapter-better-sqlite3`
- `lib/auth.ts` — NextAuth config (CredentialsProvider, JWT strategy, role injection into session)
- `lib/constants.ts` — Formatting helpers (`formatCurrency`, `formatDate`), enums and labels (all pt-BR)
- `contexts/event-context.tsx` — `useEvent()` hook for selected event across pages
- `middleware.ts` — Protects all app routes via NextAuth `withAuth`

### Database
- Prisma 7 + SQLite via `@prisma/adapter-better-sqlite3`
- DB file: `./dev.db` (relative to project root, not `prisma/`)
- Config in `prisma.config.ts` (not `datasource` in `PrismaClient` constructor)
- All child models (TicketType, BarSale, Expense, etc.) relate to `Event` with `onDelete: Cascade`

### Financial Logic
- Platform channel (ingresso.com etc.) retains 30% — defined in `lib/constants.ts` as `PLATFORM_RETENTION`
- PIX channel: 100% available
- Dashboard (`/api/dashboard`) aggregates: gross revenue → platform retention → available → paid expenses → real balance

### UI Component Gotchas
- shadcn uses `@base-ui/react` — `Button` does **not** support `asChild` prop; use a styled `<Link>` directly
- `Select.onValueChange` receives `string | null` (not just `string`)
- `next.config.mjs` has `ignoreBuildErrors: true` and `ignoreDuringBuilds: true` due to recharts type incompatibilities — do not remove these

### Authentication
- Roles: `admin`, `operator`
- Test credentials: `admin@nightcontrol.com` / `admin123` | `operador@nightcontrol.com` / `op123`
- User `id` and `role` are injected into the JWT and accessible via `session.user.role`
