# Book Club Platform (working name: blacknwhite)

India's home for reading together — a web platform where readers create and run book clubs, discuss books spoiler-safely, find meetups and bookstores near them, and buy books at the best price.

> *Goodreads tracks what you read. We help you read together — with your club, in your city, in your language.*

**Stage:** pre-build planning · **Launch:** multiple cities with active reading communities · **Owner:** Aman Chaturvedi

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

## Keeping the docs updated

1. Edit the relevant doc in `docs/` and bump its **Last updated** date in the header.
2. Add an entry to [CHANGELOG.md](CHANGELOG.md): what changed and why.
3. If the change touches both business and tech (scope, phases, costs, timeline), update both docs in the same commit so they stay consistent.
4. Log new unknowns in [open-questions.md](docs/open-questions.md); remove them once resolved.
5. Tick off checklist items (next steps, build-plan milestones) as they're done.

Diagrams are written in [Mermaid](https://mermaid.js.org/) and render directly on GitHub.
