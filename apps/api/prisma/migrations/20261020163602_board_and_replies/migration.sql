-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "parent_id" UUID;

-- AlterTable
ALTER TABLE "threads" ADD COLUMN     "is_board" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "posts_parent_id_idx" ON "posts"("parent_id");

-- CreateIndex
CREATE INDEX "threads_club_id_is_board_idx" ON "threads"("club_id", "is_board");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
