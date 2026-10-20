# Before Production — Checklist

> **Status:** open · **Last updated:** 2026-10-20
> Everything that must be done before real users are on the platform. Tick items as they're done, add new ones as they come up, and log notable changes in the [CHANGELOG](../CHANGELOG.md). Undecided questions belong in [open-questions.md](open-questions.md); this list is for work we already know we have to do.

**Priority:** **P0** blocks the private beta · **P1** needed before the public launch · **P2** soon after launch.

## Data and storage

- [ ] **P0 — Move photo uploads to Cloudflare R2.** Uploads are written to local disk (`UPLOAD_DIR`, default `apps/api/uploads`), which containers wipe on every deploy. Write the R2 version of `StorageService` (the one place uploads are read and written), set `MEDIA_BASE_URL` to the R2/CDN URL, and copy over any existing files.
- [ ] **P0 — Back up photos.** Turn on R2 object versioning, or a scheduled copy to a second bucket. The database has backups; photos currently have none.
- [ ] **P0 — Persistent volume for Meilisearch.** If the index is lost it can be rebuilt with `pnpm --filter @bnw/api search:reindex`, but search falls back to slower Postgres matching until then. Add the reindex to the deploy runbook.
- [ ] **P1 — Database sizing and alarms.** Start on `db.t4g.small` (the 1 GB RAM of `micro` gets tight at around 3–5k monthly active readers). Turn on storage autoscaling, and set CloudWatch alarms on free memory, free storage and CPU. Move to `t4g.medium` at around 30k monthly active readers.
- [ ] **P1 — Test a database restore.** Daily backups with 7-day point-in-time recovery are planned; restore one into staging once to prove it works.
- [ ] **P1 — Database size panel in the admin portal.** Table sizes and growth per week, so we notice storage changes early.
- [ ] **P2 — Re-measure the storage estimate after the private beta** with real club activity, and update the numbers below.
- [x] ~~Group notifications and delete old ones~~ — done 2026-10-20 (see CHANGELOG).

## Infrastructure and deployment

- [ ] **P0 — Dockerfiles and the AWS deploy pipeline** for staging (auto-deploy from `main`) and production (tagged releases). CI already runs typecheck, tests and builds.
- [ ] **P0 — Run the worker as its own process** (`RUN_WORKER_IN_API=false`, `node dist/worker.js`).
- [ ] **P0 — Production secrets and config:** `OPS_PASSWORD` (the API refuses to start in production with the default), `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `SMTP_URL`, `MEILI_KEY`, `WEB_ORIGIN`, `AMAZON_ASSOCIATE_TAG`. `DEV_LOGIN` is already refused in production.
- [ ] **P1 — Sentry, logs and uptime checks** (web, API health endpoint, WebSocket gateway). Product analytics with PostHog.
- [ ] **P1 — Load test** the busiest paths: thread pages, posting, the home feed and recommendations.

## Security and accounts

- [ ] **P0 — Harden the admin portal sign-in:** per-person accounts, 2FA, an IP allow-list or SSO, and alerts on failed logins. See open question 11.
- [ ] **P0 — Google OAuth production client** with a verified consent screen and the production redirect URI.
- [ ] **P1 — Security review** of auth, rate limits, uploads and the admin portal before the public launch.

## Messaging

- [ ] **P0 — Production email provider** with SPF, DKIM and DMARC on the sending domain (dev uses Mailpit).
- [ ] **P1 — Register the WhatsApp templates with Meta** (`event_reminder`, `weekly_schedule_nudge`) and set `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`. Until then, messages are only logged.

## Legal and compliance

- [ ] **P0 — Legal review** of the terms of use and privacy policy templates.
- [ ] **P0 — Name a grievance officer** and publish their contact details, as the IT Rules require.

## Catalogue quality

- [ ] **P1 — Admin tool to merge duplicate books and hide junk entries.** Searches and imports save every Open Library and Google Books result, including duplicate editions and study guides.
- [ ] **P2 — Re-run book enrichment** (`pnpm --filter @bnw/api books:enrich`) after big imports, or schedule it.

## Nice to have before launch

- [ ] **P2 — Publish the OpenAPI document** at `/docs`, generated from the shared Zod schemas.

---

## Storage estimate (2026-10-20)

Row sizes were measured in the dev database. Activity is assumed: 20 posts or comments, 25 DMs, 25 reactions and 0.3 photos per active reader each month, with 2.5 registered users per active reader. Treat the numbers as ±2× until we re-measure with beta data. Figures are for the first year, after grouping and cleaning up notifications.

| Monthly active readers | Database | Photos (R2) | Search index | Books in catalogue |
|---|---|---|---|---|
| 3,000 | ~2 GB | ~1 GB | 0.25 GB | ~35k |
| 10,000 | ~6.5 GB | ~4 GB | 0.5 GB | ~70k |
| 30,000 | ~19 GB | ~11 GB | 1.2 GB | ~170k |
| 50,000 | ~32 GB | ~18 GB | 2 GB | ~270k |

Storage cost is small: RDS disk is about ₹11 per GB-month, and R2 is free up to 10 GB, then about ₹1.25 per GB-month with no download charges. Database memory is the real limit, not disk (see "Database sizing" above).
