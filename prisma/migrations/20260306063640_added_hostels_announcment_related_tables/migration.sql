/*
  Warnings:

  - You are about to drop the column `hostel_id` on the `announcements` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AnnouncementPushJobStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "announcements" DROP CONSTRAINT "announcements_hostel_id_fkey";

-- AlterTable
ALTER TABLE "announcements" DROP COLUMN "hostel_id";

-- CreateTable
CREATE TABLE "hostel_announcement_mapping" (
    "announcement_id" INTEGER NOT NULL,
    "hostel_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hostel_announcement_mapping_pkey" PRIMARY KEY ("announcement_id","hostel_id")
);

-- CreateTable
CREATE TABLE "announcement_push_jobs" (
    "id" SERIAL NOT NULL,
    "announcement_id" INTEGER NOT NULL,
    "bull_job_id" VARCHAR(255) NOT NULL,
    "status" "AnnouncementPushJobStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_push_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" VARCHAR(20) NOT NULL,
    "organization_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcement_push_jobs_announcement_id_idx" ON "announcement_push_jobs"("announcement_id");

-- CreateIndex
CREATE INDEX "announcement_push_jobs_bull_job_id_idx" ON "announcement_push_jobs"("bull_job_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX "push_tokens_user_id_idx" ON "push_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "hostel_announcement_mapping" ADD CONSTRAINT "hostel_announcement_mapping_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_announcement_mapping" ADD CONSTRAINT "hostel_announcement_mapping_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_push_jobs" ADD CONSTRAINT "announcement_push_jobs_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
