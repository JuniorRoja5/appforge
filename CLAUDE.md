# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AppForge SaaS is a no-code mobile app builder platform (inspired by Siberian CMS). Three user tiers: **Super-Admin** (platform management), **Client** (subscribes and builds apps via visual drag-and-drop builder), **End User** (downloads generated native app). The current priority is the visual builder MVP.

## Monorepo Structure

- `appforge-backend/` — NestJS REST API (TypeScript, Prisma ORM, PostgreSQL, JWT auth)
- `appforge-builder/` — React frontend (Vite, Tailwind CSS, Zustand, @dnd-kit drag-and-drop)

## Development Commands

### Infrastructure (from `appforge-backend/`)
```bash
docker compose up -d          # Start PostgreSQL 15 + Redis 7
npx prisma migrate dev        # Run database migrations
npx prisma generate           # Regenerate Prisma client
```

### Backend (`appforge-backend/`)
```bash
npm run start:dev             # Dev server with watch mode (port 3000)
npm run build                 # Compile TypeScript (nest build)
npm run test                  # Run Jest unit tests
npm run test:e2e              # Run e2e tests (jest --config ./test/jest-e2e.json)
npm run test:cov              # Test coverage
npm run lint                  # ESLint with auto-fix
npm run format                # Prettier formatting
```

### Frontend (`appforge-builder/`)
```bash
npm run dev                   # Vite dev server
npm run build                 # TypeScript check + Vite build
npm run lint                  # ESLint
npm run preview               # Preview production build
```

### Running a single backend test
```bash
cd appforge-backend && npx jest path/to/file.spec.ts
```

## Architecture

### Backend (NestJS)

Modular NestJS architecture with these modules in `appforge-backend/src/`:

| Module | Purpose |
|--------|---------|
| `auth/` | JWT authentication via Passport.js, login/register endpoints |
| `users/` | User CRUD, lookup by email |
| `apps/` | App CRUD, schema persistence (JSON column) |
| `tenants/` | Multi-tenant management |
| `upload/` | File uploads via Multer (served from `/uploads`) |
| `prisma/` | Shared Prisma service for DB access |

**Patterns:** Thin controllers with logic in services. Role-based access via `@Roles()` decorator + `JwtAuthGuard`. CORS enabled with credentials. 50MB JSON body limit.

**Key API routes:**
- `POST /auth/login`, `POST /auth/register`
- `GET /apps`, `POST /apps`, `GET /apps/:id`, `PUT /apps/:id/schema`
- `POST /upload/image`

### Database (Prisma)

Schema at `appforge-backend/prisma/schema.prisma`. Key models:
- **Tenant** → has many Users and Apps, has one Subscription
- **User** → email/password, Role enum (SUPER_ADMIN | CLIENT), belongs to Tenant
- **App** → name, slug (unique), `schema` field (Json, stores builder canvas state), AppStatus enum (DRAFT | PUBLISHED | BUILDING)
- **Subscription** → plan name, expiration, linked to Tenant

### Frontend (React + Vite)

**Builder layout** (`appforge-builder/src/features/builder/`):
- `BuilderLayout.tsx` — Main three-panel layout with @dnd-kit DndContext
- `LeftSidebar.tsx` — Draggable module palette
- `CentralCanvas.tsx` — Drop zone simulating smartphone screen
- `RightSidebar.tsx` — Settings panel for selected element

**State management** (`appforge-builder/src/store/useBuilderStore.ts`):
- Zustand store with `temporal` middleware (zundo) for undo/redo (50-state limit)
- `CanvasElement` type: `{ id, moduleId, config }`
- Actions: `addElement`, `updateElementConfig`, `removeElement`, `moveElement`, `selectElement`

**Module system** — the core extensibility mechanism:

Interface at `appforge-builder/src/modules/base/module.interface.ts`:
```typescript
interface ModuleDefinition<T> {
  id: string;              // e.g. 'loyalty_card'
  name: string;            // Display name
  icon: React.ReactNode;
  description: string;
  schema: z.ZodType<T>;   // Zod validation
  defaultConfig: T;
  PreviewComponent: React.FC<{ data: T; isSelected: boolean }>;  // Canvas render
  RuntimeComponent: React.FC<{ data: T }>;                       // Generated app render
  SettingsPanel: React.FC<{ data: T; onChange: (data: T) => void }>; // Right sidebar
}
```

Registry at `appforge-builder/src/modules/registry.ts` — call `registerModule()` to add new modules. Current modules live in `src/modules/custom_page/`: TextModule, ImageModule, ButtonModule.

**API client** at `appforge-builder/src/lib/api.ts` — uses `VITE_API_URL` env var (defaults to `http://localhost:3000`).

## Collaboration Rules

- Communicate in **Spanish** — the user prefers Spanish for explanations and discussions
- Use **strict TypeScript** — no `any` unless justified
- **Thin controllers**, business logic in services
- Propose **file/folder structure before code** when creating new features
- Generate **complete, functional code** — no incomplete snippets
- Briefly explain **non-obvious design decisions**
- For each new component, include **manual testing instructions**
- If a request is ambiguous, **ask 1-2 clarifying questions** before generating code

## Planned v1 Modules (15)

loyalty_card, push_notification, catalog, news_feed, booking, contact, photo_gallery, social_wall, events, menu_restaurant, discount_coupon, custom_page, links, pdf_reader, fan_wall
