# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BodLife: a lifestyle-tracking app (gym workouts with progressive overload, weight tracking, meal plans, AI-assisted workout plan generation). Node/Express/TypeScript API backed by PostgreSQL (Prisma ORM), with a React/Vite frontend. It's one deployable: the client build is emitted straight into `public/`, which Express serves as static files with an SPA fallback — there is no separate frontend host.

## Commands

All API commands run from the repo root; client commands run from `client/`.

```bash
# Install
npm install                 # root — also runs `prisma generate` via postinstall
cd client && npm install    # client, separately

# Dev servers (run both; client proxies /api to localhost:3000, see client/vite.config.ts)
npm run dev                 # API on :3000 (ts-node-dev, auto-restart)
cd client && npm run dev    # Vite on :5173

# Database (Prisma)
npm run db:migrate          # prisma migrate dev
npm run db:generate         # regenerate Prisma client after schema.prisma changes
npm run db:seed             # ts-node prisma/seed.ts — demo data
npm run db:studio           # Prisma Studio GUI

# Tests
npm test                    # API — jest, all tests
npx jest tests/controllers/progression.test.ts          # API — single file
npx jest -t "positive: splits suggestions"               # API — by test name
cd client && npm test                                    # client — vitest run, all tests
cd client && npx vitest run tests/lib/defaultWeight.test.ts   # client — single file

# Build
npm run build               # API only → dist/
npm run build:client        # client only → ../public/ (see client/vite.config.ts outDir)
npm run build:all           # both, client first (API build doesn't depend on it, but prod boot does)

# Production-like run locally
npm run serve                # build:all + start

# Type-check without emitting (useful before committing)
npx tsc --noEmit
cd client && npx tsc --noEmit
```

There is no lint script configured in either `package.json` — don't invent one; CI (`.github/workflows/ci.yml`) only runs `npm test` and `npm run build` on both sides.

Server tests never touch a real database: `src/lib/prisma.ts` is auto-mocked via `src/lib/__mocks__/prisma.ts` (a `jest-mock-extended` deep mock, reset in `beforeEach`). Any test file that does `jest.mock('../../src/lib/prisma')` (or mocks a service that imports it) gets this for free — no test DB/containers needed. `tests/utils/testHelpers.ts` has `authHeader(userId)` etc. for signing JWTs against the test `JWT_SECRET` set in `tests/jest.setup.ts`.

## Architecture

### Request flow (API)

`src/server.ts` → `src/app.ts` wires middleware/routes → `routes/*.routes.ts` → `controllers/*.controller.ts` → `services/*.service.ts` (Prisma calls live here, not in controllers) → `src/lib/prisma.ts`. Swagger/OpenAPI docs are hand-written JSDoc blocks in `src/docs/*.docs.ts` (imported for side effects in `app.ts` so `swagger-jsdoc` picks them up) with shared schemas defined in `src/lib/swagger.ts`; served at `/docs` (UI) and `/docs.json` (raw spec). Every route except `/health`, `/docs*`, and `/api/auth/*` requires the `authenticate` middleware (`src/middleware/auth.middleware.ts`), which verifies a Bearer JWT and sets `req.user`. **Every Prisma query in a service must be scoped by `userId`** — there is no separate authorization layer; per-user data isolation happens at the query level, and this is exactly what `tests/security/security.test.ts` checks (cross-user access attempts) alongside the per-controller test suites in `tests/controllers/`.

Errors: throw `AppError(statusCode, message)` (`src/middleware/error.middleware.ts`) for expected failures; it also translates known Prisma error codes (P2002/P2025/P2003) into sane HTTP responses, and unhandled errors fall through to a generic 500. `express-validator` chains + the shared `validate` middleware (`src/middleware/validate.middleware.ts`) handle request-body validation in routes.

### Data model (`prisma/schema.prisma`)

- **Workouts**: `WorkoutSession` → `ExerciseLog` (one per exercise performed that session, free-text `exerciseName` — matched against `ExerciseCatalog` below, but never constrained to it) → `ExerciseSet` (weight/reps/duration/RPE, `isWarmup` flag). A session can optionally link back to `planId`/`dayNumber` if it was started from a plan.
- **Plans**: `WorkoutPlan` → `PlanDay` → `PlanExercise` → `PlanSet`. One table serves both official/sample plans (seeded at boot, `ownerId: null`, `visibility: PUBLIC`) and user-created plans (`ownerId` set, `visibility: PRIVATE`) — distinguished by ownership/visibility, not a parallel schema. `src/services/planSeed.service.ts` idempotently upserts the official plans from `src/data/workoutPlans.ts` using each plan's stable static `id` as the PK, called once from `server.ts` on boot (safe under concurrent instances/respawns — a race just hits a PK conflict and is ignored).
- **Meals**: `MealPlan` → `Meal` → `FoodItem`.
- **ExerciseCatalog**: structured facts (`muscleGroup`, `bodyRegion`, `movementPattern`, `equipment`, `loadConvention`, `progressionType`) about ~70 common exercises, keyed by canonical `name` plus an `aliases` array, seeded from `src/data/exerciseCatalog.ts` by `exerciseCatalogSeed.service.ts` (upserts, unlike the plan seed — the catalog is pure reference data nobody else writes to, so fixes take effect on the next restart). Not exhaustive by design: it's a fast path over the free-text-keyword classification, not a replacement for it — see the progressive overload engine section below.

### Progressive overload engine (`src/services/progression.service.ts`)

Classifies each exercise as `'weight'`-type (compound lifts — weight climbs, reps held constant) or `'reps'`-type (isolation/bodyweight/cable — reps climb at a fixed weight until a rep ceiling is sustained, then a small weight bump), and upper/lower body (for weight-increment size). Both classifications check `ExerciseCatalog` first (`src/services/exerciseCatalog.service.ts` — an in-memory `Map` loaded once at boot via `loadExerciseCatalogCache()`, read synchronously per-request rather than round-tripping the DB) and only fall back to keyword-matching the free-text exercise name for exercises the catalog doesn't know about. Client-side, `client/src/lib/defaultWeight.ts` (the no-history starting-weight estimate) follows the same pattern against a catalog entry fetched via `GET /api/exercises/catalog` (`client/src/lib/exerciseCatalog.ts` builds the equivalent lookup `Map` client-side) — notably this is also what fixed the "is this dumbbell exercise per-hand or one implement held two-handed" distinction a name-only check couldn't make (a swing/goblet squat vs. a curl).

Per-set targets for the current session (`perSetSuggestions`) ramp weight up across sets for `'weight'`-type exercises, or taper the rep target across sets for `'reps'`-type exercises — never the same flat number repeated on every set. Consumed by `progression.controller.ts` (`GET /api/progression`, `/:exerciseName`, `/:exerciseName/history`) and, client-side, by `WorkoutDetailPage.tsx` to placeholder each set input and by `ProgressionPage.tsx` for the dedicated progress view.

### AI workout-plan chat (`src/services/chat.service.ts`, `src/lib/gemini.ts`)

`POST /api/chat` drives a conversational plan builder via Gemini (`@google/genai`), constrained by a system prompt that refuses to go off-topic (prompt-injection resistant by design — see the instructions in `chat.service.ts`) and a strict `responseSchema` so output round-trips into the same shape `plans.controller.ts` accepts on `POST /api/plans` (`GeneratedPlan = PlanMetaInput & { days: PlanDayInput[] }`). Server-side `clampPlan()` enforces hard caps on days/exercises/sets regardless of what the model returns. Without `GEMINI_API_KEY` set, the endpoint returns 503 instead of crashing.

### Client (`client/src`)

Vite + React Router + TanStack Query, Tailwind for styling. `src/main.tsx` defines all routes; `RequireAuth` gates everything except `/login`, `/register`, `/reset-password`. `hooks/useAuth.tsx` holds the JWT/user in a context, persisted to `localStorage`; `api/client.ts` is a single Axios instance that attaches the token to every request and force-redirects to `/login` on a 401. Feature modules under `api/*.ts` are thin wrappers per resource, mirroring the server route groups 1:1.

`hooks/useUnits.ts` is the single source of truth for metric/imperial conversion and display formatting — weights are always stored/transmitted in kg; every page that shows a weight goes through this hook rather than converting inline. Path alias `@/` → `client/src` (configured in both `vite.config.ts` and `tsconfig.json`) — the API side has no such alias and uses relative imports throughout.

## Environment

Copy `.env.example` to `.env`. Required for basic dev: `DATABASE_URL`, `JWT_SECRET`. Everything else degrades gracefully rather than crashing when unset: no `RESEND_API_KEY` → password-reset links are logged to the console instead of emailed; no `GEMINI_API_KEY` → `/api/chat` returns 503. Rate limiting (`RATE_LIMIT_*`) is skipped entirely when `NODE_ENV=development`.

## Deployment

Single Render web service (`render.yaml`): build runs `npm run build:all` (client into `public/`, then API into `dist/`), start runs `prisma migrate deploy && npm start` — migrations apply on every boot, which is safe since `migrate deploy` is idempotent and Render's free tier sleeps/wakes frequently.
