-- CreateEnum
CREATE TYPE "ReactionKind" AS ENUM ('like', 'love');

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "root_id" UUID;

-- CreateTable
CREATE TABLE "post_reactions" (
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "ReactionKind" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_reactions_pkey" PRIMARY KEY ("post_id","user_id","kind")
);

-- CreateIndex
CREATE INDEX "post_reactions_post_id_kind_idx" ON "post_reactions"("post_id", "kind");

-- CreateIndex
CREATE INDEX "posts_root_id_id_idx" ON "posts"("root_id", "id");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_root_id_fkey" FOREIGN KEY ("root_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: existing comments were one level deep, so their root is their parent.
UPDATE "posts" SET "root_id" = "parent_id" WHERE "parent_id" IS NOT NULL AND "root_id" IS NULL;
