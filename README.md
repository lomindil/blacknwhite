# Book Club Platform (working name: blacknwhite)

India's home for reading together — a web platform where readers create and run book clubs, discuss books spoiler-safely, find meetups and bookstores near them, and buy books at the best price.

> *Goodreads tracks what you read. We help you read together — with your club, in your city, in your language.*

**Stage:** Phase 1 built, running locally · **Launch:** multiple cities with active reading communities · **Owner:** Aman Chaturvedi

## Documents

| Doc | What's in it |
|---|---|
| [Business Plan](docs/business-plan.md) | Problem, product, users, competition, pricing, go-to-market, roadmap, financials, risks, metrics |
| [Web Architecture](docs/architecture.md) | Phase 1 scope, system design, tech stack, auth, data model, API, key features, security, infra, build plan |
| [Open Questions](docs/open-questions.md) | Inconsistencies and undecided points to resolve |
| [CHANGELOG](CHANGELOG.md) | Dated log of every change to the plan and why |

The original PDFs (dated 2026-10-19) are kept in the repo root for reference. **The Markdown files are now the source of truth**; the PDFs are not updated.

## At a glance

- **Wedge:** club organizers, who today run clubs on WhatsApp + Instagram + Google Meet. Each one brings 10–50 readers.
- **Phase 1:** responsive web app, Google sign-in, free for readers. Modular monolith: Next.js + NestJS + PostgreSQL, hosted in AWS Mumbai.
- **Revenue:** organizer plans (₹149 / ₹349 per month), 5% ticketing fee, bookstore listings, affiliate links, light ads; corporate clubs later.
- **Not tied to one city:** launches wherever a thriving reading community exists; metros likely lead early traction.
- **Gate 1:** 100 active clubs and 20 paying organizers, then expand into more communities.
- **North-star metric:** weekly active clubs.

## Running it locally

Needs Node 22+, pnpm 9 (`npm i -g pnpm@9`) and Docker.

```bash
pnpm install
pnpm services:up                     # Postgres :5433, Redis :6380, Meilisearch :7700, Mailpit :8025
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @bnw/shared build
pnpm db:migrate                      # create the tables
pnpm db:seed                         # sample clubs, books, events, bookstores (wipes data)
pnpm dev                             # API on :4000 (with worker), web on :3000
```

After the first setup, day to day you only need two commands:

```bash
scripts/start.sh            # Docker services → migrations → API → web; prints URLs when ready
scripts/stop.sh             # stops web, API and Docker services (data is kept)
```

`start.sh` options: `--prod` (production builds, lighter on memory), `--seed` (reload sample data), `--no-web`. `stop.sh` options: `--keep-services`, `--down` (remove containers), `--purge` (also delete the local database; asks first). Logs are in `.run/`.

Open http://localhost:3000 and use **Developer sign-in** with any seeded email, e.g. `meera@example.com` (organizer), `karthik@example.com` (a reader who is behind on chapters, to see spoiler gating) or `admin@example.com` (moderation). Use `newreader@example.com` to see the first-run experience: a brand-new account that goes through onboarding, the "get matched" quiz and recommendations. Emails land in Mailpit at http://localhost:8025.

**Admin portal:** http://localhost:3000/ops (unlisted). Default sign-in `ops@bookclub.local` / `ChangeMe-ops-2026` — set `OPS_EMAIL` and `OPS_PASSWORD` in `apps/api/.env` to change it.

To turn on Google sign-in, create an OAuth client (redirect URI `http://localhost:3000/auth/google/callback`) and set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `apps/api/.env`.

| Command | What it does |
|---|---|
| `pnpm dev` | Run API and web in watch mode |
| `pnpm build` | Production builds of all packages |
| `pnpm typecheck` | Typecheck everything |
| `pnpm --filter @bnw/api test` | Unit tests and authorization integration tests (uses a `bnw_test` database: `docker exec blacknwhite-postgres-1 createdb -U bnw bnw_test`) |
| `pnpm --filter @bnw/api search:reindex` | Rebuild Meilisearch indexes from Postgres |
| `node apps/api/dist/worker.js` | Standalone background worker (production) |

### Code layout

```
apps/api/            NestJS API, background worker, Prisma schema and migrations, seed
  src/core/          Prisma, Redis, queues, search, notifications, realtime, access checks
  src/<feature>/     auth, users, books, imports, clubs, discussion, dms, events, bookstores, safety, media, blog, ops, recommendations
apps/web/            Next.js web app (proxies /api and /auth to the API)
packages/shared/     Zod request schemas, response types, cities and languages
docs/                Business plan, architecture, open questions
```

## Keeping the docs updated

1. Edit the relevant doc in `docs/` and bump its **Last updated** date in the header.
2. Add an entry to [CHANGELOG.md](CHANGELOG.md): what changed and why.
3. If the change touches both business and tech (scope, phases, costs, timeline), update both docs in the same commit so they stay consistent.
4. Log new unknowns in [open-questions.md](docs/open-questions.md); remove them once resolved.
5. Tick off checklist items (next steps, build-plan milestones) as they're done.

Diagrams are written in [Mermaid](https://mermaid.js.org/) and render directly on GitHub.
