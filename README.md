# NutriAI

NutriAI is a nutrition workspace built with Next.js 16, Bun, Prisma, Better Auth, Elysia, and React Query. It combines food logging, meal planning, goal tracking, profile-driven nutrition targets, and an AI assistant that can search foods, review progress, and log meals.

## Feature Surface

- Dashboard with range-based trends, streaks, adherence summaries, recent activity, and setup-driven quick actions
- Food database management for custom foods and macro data
- Daily food log with grouped meals, edit/delete flows, recent-food shortcuts, and macro targets
- Meal plans with per-day planning and one-click application into the food log
- Goals with derived progress for calorie, protein, and weight-oriented tracking
- AI assistant with persistent conversations, rename/delete actions, and nutrition-aware context
- Profile and settings pages for body metrics, targets, theme, and dashboard preferences

## Stack

- `Next.js 16` with the App Router
- `Bun` for package management and scripts
- `Prisma` with PostgreSQL
- `Better Auth` for email/password authentication
- `Elysia` + `Eden Treaty` for the API layer
- `React Query` for client data fetching and cache invalidation
- `Biome` for linting and formatting

## Environment Variables

Create a local `.env` with the values your environment needs:

```env
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
AI_PROVIDER="openai"

# If AI_PROVIDER=openai
OPENAI_API_KEY="..."

# If AI_PROVIDER=anthropic
ANTHROPIC_API_KEY="..."
```

Notes:

- `DATABASE_URL` is required for Prisma, auth, and all app data.
- `NEXT_PUBLIC_APP_URL` is used by the API client and Better Auth trusted origins.
- `AI_PROVIDER` defaults to `openai` when omitted.

## Local Setup

1. Install dependencies:

```bash
bun install
```

2. Generate the Prisma client:

```bash
bun run db:generate
```

3. Push the schema or run migrations:

```bash
bun run db:push
# or
bun run db:migrate
```

4. Seed starter data if needed:

```bash
bun run db:seed
```

5. Start the dev server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Main Scripts

- `bun dev` starts the Next.js dev server with Turbopack
- `bun run build` generates Prisma and runs a production webpack build
- `bun start` runs the production server
- `bun run lint` runs Biome checks
- `bun run lint:fix` applies safe Biome fixes
- `bun run format` formats the repo
- `bun test` runs Bun unit tests
- `bun run db:generate` regenerates Prisma client output
- `bun run db:push` syncs the schema to the database
- `bun run db:migrate` creates and applies a development migration
- `bun run db:seed` seeds the database

## Route Overview

- `/` dashboard with trend cards, adherence summaries, and quick actions
- `/assistant` persistent AI chat for nutrition tasks
- `/log` daily food log with editable entries and macro progress
- `/plans` weekly meal plans and apply-to-log flow
- `/goals` active and historical goals
- `/foods` food library management
- `/profile` body metrics and nutrition targets
- `/settings` theme and workspace preferences

## API Overview

The Elysia API is mounted under `/api`, with route groups in [`server/routes`](/Users/vvybyranyi/Desktop/year4/kursach/server/routes).

Important endpoints:

- `GET /api/profile/stats` returns chart-ready daily totals, streaks, adherence, and range summaries
- `PATCH /api/food-logs/items/:itemId` edits logged servings, meal type, and notes
- `POST /api/meal-plans/:id/apply` copies planned meals into a selected log date
- `PATCH /api/chat/conversations/:id` renames an AI conversation
- `DELETE /api/chat/conversations/:id` deletes an AI conversation
- `GET /api/docs` serves Swagger docs for the Elysia API

## Prisma Workflow

- Schema lives in [`prisma/schema.prisma`](/Users/vvybyranyi/Desktop/year4/kursach/prisma/schema.prisma)
- Seed logic lives in [`prisma/seed.ts`](/Users/vvybyranyi/Desktop/year4/kursach/prisma/seed.ts)
- Generated Prisma output is committed under [`generated/prisma`](/Users/vvybyranyi/Desktop/year4/kursach/generated/prisma) and should not be edited manually

For schema updates:

1. Edit the Prisma schema
2. Run `bun run db:migrate` or `bun run db:push`
3. Run `bun run db:generate`
4. Verify with `bun run lint`, `bun test`, and `bun run build`

## Verification Baseline

Before opening a PR, run:

```bash
bun run lint
bun test
bun run build
```

For database changes, also run the relevant Prisma command locally and review the resulting migration carefully.
