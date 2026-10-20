-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "group_key" TEXT;

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- At most one unread notification per person per group (thread, post, club joins…).
CREATE UNIQUE INDEX "notifications_unread_group_key" ON "notifications"("user_id", "group_key") WHERE "read_at" IS NULL AND "group_key" IS NOT NULL;
