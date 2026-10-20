-- AlterTable
ALTER TABLE "books" ADD COLUMN     "genres" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "reading_profiles" (
    "user_id" UUID NOT NULL,
    "reading_level" TEXT NOT NULL,
    "goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "format" TEXT NOT NULL DEFAULT 'either',
    "pace" TEXT NOT NULL DEFAULT 'steady',
    "length" TEXT NOT NULL DEFAULT 'any',
    "loved_book_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_profiles_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "reading_profiles" ADD CONSTRAINT "reading_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
