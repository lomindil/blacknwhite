-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "title" TEXT;

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "post_id" UUID,
    "key" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_key_key" ON "media"("key");

-- CreateIndex
CREATE INDEX "media_post_id_position_idx" ON "media"("post_id", "position");

-- CreateIndex
CREATE INDEX "media_owner_id_created_at_idx" ON "media"("owner_id", "created_at");

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
