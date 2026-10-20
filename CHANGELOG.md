# Plan Changelog

Every change to the plan gets an entry here, newest first. Record *what* changed and *why*, so the reasoning survives after the docs are edited.

Format:

```
## YYYY-MM-DD — short title
**Docs:** business-plan / architecture
**Change:** what changed
**Why:** what prompted it (interview finding, cost, new data…)
```

---

## 2026-10-19 — Phase 1 web platform built (local development)

**Docs:** architecture, README, open-questions
**Change:** Built the full Phase 1 scope as working code: a pnpm/Turborepo monorepo with `apps/api` (NestJS, Prisma, PostgreSQL, Redis, BullMQ, Socket.IO, Meilisearch), `apps/web` (Next.js App Router, Tailwind) and `packages/shared` (Zod schemas and types). It covers Google sign-in, onboarding, catalog and search, reading status and aggregate counts, clubs with roles, invites, schedules and polls, spoiler-gated threads with realtime updates, club-scoped DMs, events with RSVPs, waitlist and reminders, the bookstore directory, notifications (in-app, email digest, WhatsApp), Goodreads/StoryGraph import, reports, blocks, a moderation console, data export and account deletion. Added a seed script, 24 automated tests and CI. Architecture §11 marks build status; the new §12 records additions, deviations and gaps.
**Why:** Build a working product first, then decide launch details.

## 2026-10-19 — Not a single-city launch

**Docs:** business-plan, architecture, README
**Change:** Dropped the "Bangalore first" strategy. The platform launches in multiple cities wherever a thriving reading community exists; metros are expected to lead early traction but aren't a requirement. Rewrote Go-to-market (§7), roadmap phase labels ("launch communities" → "more communities" → "nationwide"), Phase 1 goal, personas, financial-model note, next steps, and city examples in the architecture doc. Gate targets (100 / 300 clubs) are unchanged and now count across all communities.
**Why:** The product isn't tied to one city; reading communities exist in many places and should be served from day one.

## 2026-10-19 — Initial Markdown version

**Docs:** business-plan, architecture
**Change:** Converted the two original PDFs (Business Plan, Web Architecture — both dated 2026-10-19) into Markdown under `docs/`. Content carried over as written; diagrams redrawn as Mermaid.
**Why:** Keep the plan in git so it can be versioned and edited as it evolves.
