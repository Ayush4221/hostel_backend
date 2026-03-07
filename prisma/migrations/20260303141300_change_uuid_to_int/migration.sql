/*
  Warnings:

  - The primary key for the `announcements` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `announcements` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `hostel_id` column on the `announcements` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `attendance_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `attendance_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `complaints` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `complaints` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `hostel_memberships` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `hostel_memberships` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `room_id` column on the `hostel_memberships` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `hostels` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `hostels` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `leaves` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `leaves` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `organization_memberships` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `organization_memberships` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `parent_student_links` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `parent_student_links` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `rooms` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `rooms` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `hostel_id` on the `attendance_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `hostel_id` on the `complaints` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `hostel_id` on the `hostel_memberships` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `hostel_id` on the `leaves` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `hostel_id` on the `rooms` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "announcements" DROP CONSTRAINT "announcements_hostel_id_fkey";

-- DropForeignKey
ALTER TABLE "attendance_logs" DROP CONSTRAINT "attendance_logs_hostel_id_fkey";

-- DropForeignKey
ALTER TABLE "complaints" DROP CONSTRAINT "complaints_hostel_id_fkey";

-- DropForeignKey
ALTER TABLE "hostel_memberships" DROP CONSTRAINT "hostel_memberships_hostel_id_fkey";

-- DropForeignKey
ALTER TABLE "hostel_memberships" DROP CONSTRAINT "hostel_memberships_room_id_fkey";

-- DropForeignKey
ALTER TABLE "leaves" DROP CONSTRAINT "leaves_hostel_id_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_hostel_id_fkey";

-- AlterTable
ALTER TABLE "announcements" DROP CONSTRAINT "announcements_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "hostel_id",
ADD COLUMN     "hostel_id" INTEGER,
ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "attendance_logs" DROP CONSTRAINT "attendance_logs_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "hostel_id",
ADD COLUMN     "hostel_id" INTEGER NOT NULL,
ADD CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "complaints" DROP CONSTRAINT "complaints_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "hostel_id",
ADD COLUMN     "hostel_id" INTEGER NOT NULL,
ADD CONSTRAINT "complaints_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "hostel_memberships" DROP CONSTRAINT "hostel_memberships_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "hostel_id",
ADD COLUMN     "hostel_id" INTEGER NOT NULL,
DROP COLUMN "room_id",
ADD COLUMN     "room_id" INTEGER,
ADD CONSTRAINT "hostel_memberships_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "hostels" DROP CONSTRAINT "hostels_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "hostels_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "leaves" DROP CONSTRAINT "leaves_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "hostel_id",
ADD COLUMN     "hostel_id" INTEGER NOT NULL,
ADD CONSTRAINT "leaves_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "organization_memberships" DROP CONSTRAINT "organization_memberships_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "parent_student_links" DROP CONSTRAINT "parent_student_links_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "parent_student_links_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "hostel_id",
ADD COLUMN     "hostel_id" INTEGER NOT NULL,
ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_logs_student_user_id_hostel_id_date_key" ON "attendance_logs"("student_user_id", "hostel_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "hostel_memberships_hostel_id_user_id_key" ON "hostel_memberships"("hostel_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_hostel_id_room_number_key" ON "rooms"("hostel_id", "room_number");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_memberships" ADD CONSTRAINT "hostel_memberships_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_memberships" ADD CONSTRAINT "hostel_memberships_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
