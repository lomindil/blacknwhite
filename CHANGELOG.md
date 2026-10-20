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

## 2026-10-20 — Grouped notifications, pre-production checklist

**Docs:** production-checklist (new), architecture (§12), README
**Change:**
- **Grouped notifications.** Replies in the same thread, replies to the same comment, comments on the same post, and new members joining a club now merge into one unread notification per person: "Arjun, Meera and 3 others replied in Week 2". Each update replaces the old row with a new one, so it moves to the top of Activity. The unread badge doesn't count it twice. Once read, the next reply starts a fresh notification.
- **Notification cleanup.** A daily job deletes read notifications after 90 days and unread ones after a year.
- Schema: `notifications.group_key` with a partial unique index (one unread notification per person per group), and an index on `created_at` (migration `notification_groups`).
- **Pre-production checklist.** Added `docs/production-checklist.md`, which lists the work required before launch (R2 photo storage, deploy pipeline, admin portal hardening, legal review and more) and a storage estimate.

**Why:** The storage review found that each post created up to 100 notification rows, which were never deleted. At 10k monthly active readers, notifications would have been about 60% of the database (~8.5 GB in the first year). They were also noisy for readers. With grouping and cleanup, the first-year estimate drops from about 14 GB to about 6.5 GB.

## 2026-10-20 — Books page, book details, quiz clean-up

**Docs:** architecture (§12)
**Change:**
- **Books page.** It now lists the catalogue straight away, most-read first, with genre and language filters and pages of 20. Each book is a full-width row showing cover, year, language, pages, a short description, genres, reader and club counts, and "Want to read" (or the reader's shelf status). Search results use the same rows. New endpoint: `GET /v1/books?q=&genre=&language=&page=`.
- **Book details.** Open Library's search results carry no description, so books found through search showed little detail. Each such book is now enriched in the background from its Open Library work record, falling back to Google Books: description, page count, cover, year and genres. Only empty fields are filled. A book that hasn't been enriched yet is enriched when someone first opens it, waiting at most 3.5 seconds. `pnpm --filter @bnw/api books:enrich` does the same for existing books, and the seed queues it. The sample catalogue also gained hand-written descriptions for books those sources don't describe well. Schema: `books.enriched_at` (migration `book_enrichment`).
- **Book page** shows genres, which link to the filtered Books page.
- **Onboarding** asks only name, city and consent. Genres and languages are asked once, in the quiz that follows.
- **User menu** has a single "Reading preferences" entry, which opens the For you page; the quiz is retaken from there.
- **For you page.** The second book section is called "More books for you" and uses full-width rows.
- **Home page** no longer has a "Books for you" panel.

**Why:** User feedback. Questions were asked twice, the menu had duplicate entries, the Books page was empty until you searched, and books found through search had almost no details.

## 2026-10-20 — Recommendations and the "get matched" quiz

**Docs:** architecture (§12), README
**Change:**
- Added personalised recommendations of clubs to join and books to read, each with the reasons behind it. They take into account:
  - an optional seven-question quiz (reading level, genres, languages, books you loved, goals, in person or online, pace, book length);
  - everything already known about the reader: shelves and ratings (including Goodreads imports), the books of their clubs, readers with similar taste, their city and their languages.
- New readers also get short "starter" books.
- Onboarding now leads into the quiz, which can be skipped. The home page greets brand-new accounts with "Let's find your first book club" and shows picks to everyone.
- There is a new **For you** page (`/discover`), linked in the nav, and the quiz can be retaken at any time (`/discover/quiz`).
- Books now carry genres. These are mapped from Open Library and Google subjects on lookup, and a backfill script fills them in for existing books.
- Schema: `books.genres`, `reading_profiles` (migration `recommendations`).
- The seed adds an empty account, `newreader@example.com`, for trying the first-run experience.

**Why:** People who sign up need help choosing a first club or book, especially those who haven't read much recently. Readers who already have a history shouldn't have to start from scratch.

## 2026-10-20 — About page, community blog, admin portal

**Docs:** architecture (§12), README, open-questions
**Change:** Added an About Us page (`/about`). Added the community blog from the Phase 2 plan, early: anyone can write (cover photo, inline photos, tags, drafts), readers like posts, "Most loved" surfaces the best; posts from accounts younger than 7 days wait for review; blog posts can be reported. Added an unlisted admin portal at `/ops` with its own email/password login (defaults in `OPS_EMAIL`/`OPS_PASSWORD`; the API refuses to start in production with the default password): overview stats (DAU/WAU/MAU, signups, weekly active clubs, activity, content and safety counts, 30-day charts, top clubs and cities), user search with deactivate/reactivate, club search with shut down/restore, blog review queue, and an audit log of every portal action. Active users are tracked with `users.last_active_at` (throttled) and per-day Redis HyperLogLogs. Schema: `users.last_active_at/suspended_at/suspended_reason`, `clubs.shutdown_reason`, `blog_posts`, `blog_likes`, `admin_actions`, `media.blog_post_id` (migration `blog_and_admin_portal`).
**Why:** The site needed an About page and the blog; operating the platform needs visibility and the ability to act on accounts and clubs.

## 2026-10-20 — Board reactions, comment threads, post pages

**Docs:** architecture (§12)
**Change:** The board feed no longer shows comments inline: each post ends with 👍/❤️ reactions on the left and "N comments · View all" on the right, which opens the post's own page (`/clubs/:slug/board/:postId`) with the full comment thread. Comments can be reacted to and replied to at any depth (indented up to four levels). Notifications go to the person replied to and to the post's author. Schema: `posts.root_id` (backfilled), new `post_reactions` table (migration `reactions_and_comment_threads`). New endpoints: `GET /v1/board-posts/:id`, `POST /v1/posts/:id/reactions` (toggle).
**Why:** Keep the feed scannable, give conversations their own space, and let people respond lightly without writing a comment.

## 2026-10-20 — Board posts with titles and photos

**Docs:** architecture (§12)
**Change:** Message-board posts now have a title, a message and up to 4 photos, shown as a gallery with a full-screen viewer. Photos upload on selection (`POST /v1/media`) and attach to the post by id; the API re-encodes every image with sharp (WebP, max 1600px, orientation applied), which strips EXIF including GPS location. Stored on disk under `UPLOAD_DIR` and served at `/media/…` (proxied by the web app); unattached uploads are deleted by a daily job. Schema: `posts.title`, new `media` table (migration `post_titles_and_media`). Removed posts without comments now disappear from the board.
**Why:** Club members want to share meetup photos and announcements as proper posts — without leaking where a photo was taken.

## 2026-10-20 — Club message board, book archive, poll pop-ups

**Docs:** architecture (§12)
**Change:** Each club gets a message board — a general feed where members post and comment (replaces "start a conversation"; book talk stays in the book's weekly threads). Book discussion now keeps an archive of every earlier book, whose threads stay open for reading and posting. Voting happens in a pop-up over the page (overview and Polls page); the Polls page is for creating polls and seeing past results. "About this club" moved to the top of the overview; "Report this club" removed from the club panel for now. Schema: `threads.is_board`, `posts.parent_id` (migration `board_and_replies`). New endpoints: `GET/POST /v1/clubs/:id/board`, `POST /v1/posts/:id/replies`.
**Why:** Clubs need an everyday place to talk that isn't tied to a chapter, readers want to revisit past books, and voting shouldn't take you away from the page.

## 2026-10-20 — Club side panel, two-pane messages, landing for everyone

**Docs:** — (UI only)
**Change:** Club pages use a sticky side panel (club identity, current book with progress, section links, organizer quick actions) instead of top tabs; Overview becomes a dashboard (reading-now timeline, meetups, latest discussion, open poll, about, past reads); new-thread and new-poll forms collapse until needed; members show as a card grid; Manage uses card sections. Messages is now a two-pane inbox (conversation list + chat) with a contrasted message area, day separators and a composer bar. The landing page at `/` is shown to everyone; the signed-in feed moved to `/home` (header gets a Home link; sign-in and onboarding land on `/home`). Fixed the feature carousel clipping its tabs and overlay cards.
**Why:** Make better use of wide screens, make chat readable, and let signed-in readers reach the landing page.

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
