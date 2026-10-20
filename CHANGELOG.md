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

## 2026-10-20 — Visual redesign and new landing page

**Docs:** — (UI only)
**Change:** Light, warm theme replaces black-and-white: off-white page, white surfaces, deep sage as the brand colour, and muted accents (clay, sky, ochre, plum, rose) per feature area. Automatic dark mode removed. New placeholder logo (open book, two readers) and favicon; the product name lives in `apps/web/src/lib/brand.ts`. One footer for all pages. Landing page rebuilt: new tagline ("Start a book club. Find your people. Read together." — no competitor named), hero listing the club basics, an 8-slide feature carousel (clubs, voting, reading schedules, chat, meetups, city and language, Goodreads import and buying, safety), how-it-works steps, clubs, cities and reader/organizer calls to action. Added motion: scroll reveals, floating hero cards, animated mock UIs, card hover lift — all disabled under reduced-motion.
**Why:** The site should feel like a warm, production-grade community product, and lead with what clubs can do rather than with competitors.

Follow-up the same day: added photography so the page feels like a book club, not a dashboard — a café meetup and an Indian reader in the hero (with the product cards floating around them), a new "Wherever readers gather" photo grid, a photo behind every carousel feature, and photos on the reader/organizer cards. 17 Unsplash-licensed photos, self-hosted in `apps/web/public/images/landing/` with sources in `CREDITS.md`; to be replaced with photos of real clubs later.

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
