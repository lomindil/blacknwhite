-- CreateEnum
CREATE TYPE "DmPolicy" AS ENUM ('club_members', 'nobody');

-- CreateEnum
CREATE TYPE "BookSource" AS ENUM ('openlibrary', 'google', 'user', 'import', 'seed');

-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('approved', 'pending', 'rejected');

-- CreateEnum
CREATE TYPE "ReadingStatusValue" AS ENUM ('want', 'reading', 'read');

-- CreateEnum
CREATE TYPE "ClubVisibility" AS ENUM ('public', 'private');

-- CreateEnum
CREATE TYPE "ClubRole" AS ENUM ('owner', 'admin', 'member');

-- CreateEnum
CREATE TYPE "PollKind" AS ENUM ('book', 'time', 'general');

-- CreateEnum
CREATE TYPE "EventMode" AS ENUM ('online', 'in_person');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('going', 'maybe', 'no', 'waitlist');

-- CreateEnum
CREATE TYPE "ReportTarget" AS ENUM ('post', 'thread', 'dm_message', 'user', 'club', 'event', 'book');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('open', 'actioned', 'dismissed');

-- CreateEnum
CREATE TYPE "ImportSource" AS ENUM ('goodreads', 'storygraph');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('queued', 'processing', 'done', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "avatar_url" TEXT,
    "city" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bio" TEXT,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "onboarded_at" TIMESTAMP(3),
    "terms_accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_identities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "user_id" UUID NOT NULL,
    "notify_email" BOOLEAN NOT NULL DEFAULT true,
    "email_digest" BOOLEAN NOT NULL DEFAULT true,
    "notify_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp_number" TEXT,
    "whatsapp_opt_in_at" TIMESTAMP(3),
    "dm_policy" "DmPolicy" NOT NULL DEFAULT 'club_members',
    "last_digest_at" TIMESTAMP(3),

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "description" TEXT,
    "cover_url" TEXT,
    "page_count" INTEGER,
    "chapter_count" INTEGER,
    "published_year" INTEGER,
    "source" "BookSource" NOT NULL,
    "external_id" TEXT,
    "status" "BookStatus" NOT NULL DEFAULT 'approved',
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_editions" (
    "id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "isbn13" TEXT,
    "isbn10" TEXT,
    "format" TEXT,
    "publisher" TEXT,
    "language" TEXT,

    CONSTRAINT "book_editions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authors" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_native" TEXT,

    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_authors" (
    "book_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "book_authors_pkey" PRIMARY KEY ("book_id","author_id")
);

-- CreateTable
CREATE TABLE "book_links" (
    "id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "retailer" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "last_price_inr" INTEGER,
    "checked_at" TIMESTAMP(3),

    CONSTRAINT "book_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_status" (
    "user_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "status" "ReadingStatusValue" NOT NULL,
    "progress_pct" INTEGER NOT NULL DEFAULT 0,
    "current_chapter" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "rating" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_status_pkey" PRIMARY KEY ("user_id","book_id")
);

-- CreateTable
CREATE TABLE "book_stats" (
    "book_id" UUID NOT NULL,
    "city" TEXT NOT NULL,
    "reading_count" INTEGER NOT NULL DEFAULT 0,
    "clubs_reading_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_stats_pkey" PRIMARY KEY ("book_id","city")
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "city" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "visibility" "ClubVisibility" NOT NULL DEFAULT 'public',
    "owner_id" UUID NOT NULL,
    "current_book_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_members" (
    "club_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "ClubRole" NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_members_pkey" PRIMARY KEY ("club_id","user_id")
);

-- CreateTable
CREATE TABLE "club_invites" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "created_by_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3),
    "max_uses" INTEGER,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_books" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE,
    "schedule" JSONB,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "polls" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "kind" "PollKind" NOT NULL DEFAULT 'general',
    "closes_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_options" (
    "id" UUID NOT NULL,
    "poll_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "book_id" UUID,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_votes" (
    "poll_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "option_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("poll_id","user_id")
);

-- CreateTable
CREATE TABLE "threads" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "book_id" UUID,
    "club_book_id" UUID,
    "schedule_week" INTEGER,
    "title" TEXT NOT NULL,
    "chapter_gate" INTEGER NOT NULL DEFAULT 0,
    "author_id" UUID,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "post_count" INTEGER NOT NULL DEFAULT 0,
    "last_post_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" UUID NOT NULL,
    "thread_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "chapter_ref" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dm_conversations" (
    "id" UUID NOT NULL,
    "pair_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dm_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dm_participants" (
    "conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "last_read_at" TIMESTAMP(3),

    CONSTRAINT "dm_participants_pkey" PRIMARY KEY ("conversation_id","user_id")
);

-- CreateTable
CREATE TABLE "dm_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "dm_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "club_id" UUID,
    "bookstore_id" UUID,
    "created_by_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "mode" "EventMode" NOT NULL,
    "venue_name" TEXT,
    "area" TEXT,
    "address" TEXT,
    "address_rsvp_only" BOOLEAN NOT NULL DEFAULT true,
    "city" TEXT,
    "meeting_url" TEXT,
    "capacity" INTEGER,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_rsvps" (
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "RsvpStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_rsvps_pkey" PRIMARY KEY ("event_id","user_id")
);

-- CreateTable
CREATE TABLE "bookstores" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "area" TEXT,
    "city" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "phone" TEXT,
    "website" TEXT,
    "hours" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "secondhand" BOOLEAN NOT NULL DEFAULT false,
    "claimed_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookstores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "read_at" TIMESTAMP(3),
    "emailed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "target_type" "ReportTarget" NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'open',
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMP(3),
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("blocker_id","blocked_id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source" "ImportSource" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'queued',
    "total" INTEGER NOT NULL DEFAULT 0,
    "matched" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "unmatched" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_city_idx" ON "users"("city");

-- CreateIndex
CREATE INDEX "user_identities_user_id_idx" ON "user_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_provider_provider_user_id_key" ON "user_identities"("provider", "provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "books_external_id_key" ON "books"("external_id");

-- CreateIndex
CREATE INDEX "books_title_idx" ON "books"("title");

-- CreateIndex
CREATE INDEX "books_status_idx" ON "books"("status");

-- CreateIndex
CREATE UNIQUE INDEX "book_editions_isbn13_key" ON "book_editions"("isbn13");

-- CreateIndex
CREATE UNIQUE INDEX "book_editions_isbn10_key" ON "book_editions"("isbn10");

-- CreateIndex
CREATE INDEX "book_editions_book_id_idx" ON "book_editions"("book_id");

-- CreateIndex
CREATE INDEX "authors_name_idx" ON "authors"("name");

-- CreateIndex
CREATE INDEX "book_authors_author_id_idx" ON "book_authors"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "book_links_book_id_retailer_key" ON "book_links"("book_id", "retailer");

-- CreateIndex
CREATE INDEX "reading_status_book_id_status_idx" ON "reading_status"("book_id", "status");

-- CreateIndex
CREATE INDEX "reading_status_user_id_status_idx" ON "reading_status"("user_id", "status");

-- CreateIndex
CREATE INDEX "book_stats_city_reading_count_idx" ON "book_stats"("city", "reading_count");

-- CreateIndex
CREATE UNIQUE INDEX "clubs_slug_key" ON "clubs"("slug");

-- CreateIndex
CREATE INDEX "clubs_city_visibility_idx" ON "clubs"("city", "visibility");

-- CreateIndex
CREATE INDEX "club_members_user_id_idx" ON "club_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_invites_code_key" ON "club_invites"("code");

-- CreateIndex
CREATE INDEX "club_invites_club_id_idx" ON "club_invites"("club_id");

-- CreateIndex
CREATE INDEX "club_books_club_id_is_current_idx" ON "club_books"("club_id", "is_current");

-- CreateIndex
CREATE INDEX "polls_club_id_created_at_idx" ON "polls"("club_id", "created_at");

-- CreateIndex
CREATE INDEX "poll_options_poll_id_idx" ON "poll_options"("poll_id");

-- CreateIndex
CREATE INDEX "threads_club_id_last_post_at_idx" ON "threads"("club_id", "last_post_at");

-- CreateIndex
CREATE UNIQUE INDEX "threads_club_book_id_schedule_week_key" ON "threads"("club_book_id", "schedule_week");

-- CreateIndex
CREATE INDEX "posts_thread_id_id_idx" ON "posts"("thread_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "dm_conversations_pair_key_key" ON "dm_conversations"("pair_key");

-- CreateIndex
CREATE INDEX "dm_participants_user_id_idx" ON "dm_participants"("user_id");

-- CreateIndex
CREATE INDEX "dm_messages_conversation_id_id_idx" ON "dm_messages"("conversation_id", "id");

-- CreateIndex
CREATE INDEX "events_city_starts_at_idx" ON "events"("city", "starts_at");

-- CreateIndex
CREATE INDEX "events_club_id_starts_at_idx" ON "events"("club_id", "starts_at");

-- CreateIndex
CREATE INDEX "events_bookstore_id_starts_at_idx" ON "events"("bookstore_id", "starts_at");

-- CreateIndex
CREATE INDEX "event_rsvps_event_id_status_created_at_idx" ON "event_rsvps"("event_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "bookstores_slug_key" ON "bookstores"("slug");

-- CreateIndex
CREATE INDEX "bookstores_city_area_idx" ON "bookstores"("city", "area");

-- CreateIndex
CREATE INDEX "notifications_user_id_id_idx" ON "notifications"("user_id", "id");

-- CreateIndex
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "blocks_blocked_id_idx" ON "blocks"("blocked_id");

-- CreateIndex
CREATE INDEX "import_jobs_user_id_created_at_idx" ON "import_jobs"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_editions" ADD CONSTRAINT "book_editions_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_authors" ADD CONSTRAINT "book_authors_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_authors" ADD CONSTRAINT "book_authors_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_links" ADD CONSTRAINT "book_links_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_status" ADD CONSTRAINT "reading_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_status" ADD CONSTRAINT "reading_status_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_stats" ADD CONSTRAINT "book_stats_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_current_book_id_fkey" FOREIGN KEY ("current_book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_invites" ADD CONSTRAINT "club_invites_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_invites" ADD CONSTRAINT "club_invites_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_books" ADD CONSTRAINT "club_books_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_books" ADD CONSTRAINT "club_books_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polls" ADD CONSTRAINT "polls_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polls" ADD CONSTRAINT "polls_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threads" ADD CONSTRAINT "threads_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threads" ADD CONSTRAINT "threads_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threads" ADD CONSTRAINT "threads_club_book_id_fkey" FOREIGN KEY ("club_book_id") REFERENCES "club_books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threads" ADD CONSTRAINT "threads_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dm_participants" ADD CONSTRAINT "dm_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "dm_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dm_participants" ADD CONSTRAINT "dm_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dm_messages" ADD CONSTRAINT "dm_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "dm_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dm_messages" ADD CONSTRAINT "dm_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_bookstore_id_fkey" FOREIGN KEY ("bookstore_id") REFERENCES "bookstores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookstores" ADD CONSTRAINT "bookstores_claimed_by_id_fkey" FOREIGN KEY ("claimed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
