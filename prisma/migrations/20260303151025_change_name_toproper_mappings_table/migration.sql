/*
  Warnings:

  - You are about to drop the `hostel_memberships` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `organization_memberships` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `parent_student_links` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "hostel_memberships" DROP CONSTRAINT "hostel_memberships_hostel_id_fkey";

-- DropForeignKey
ALTER TABLE "hostel_memberships" DROP CONSTRAINT "hostel_memberships_room_id_fkey";

-- DropForeignKey
ALTER TABLE "hostel_memberships" DROP CONSTRAINT "hostel_memberships_user_id_fkey";

-- DropForeignKey
ALTER TABLE "organization_memberships" DROP CONSTRAINT "organization_memberships_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "organization_memberships" DROP CONSTRAINT "organization_memberships_user_id_fkey";

-- DropForeignKey
ALTER TABLE "parent_student_links" DROP CONSTRAINT "parent_student_links_parent_user_id_fkey";

-- DropForeignKey
ALTER TABLE "parent_student_links" DROP CONSTRAINT "parent_student_links_student_user_id_fkey";

-- DropTable
DROP TABLE "hostel_memberships";

-- DropTable
DROP TABLE "organization_memberships";

-- DropTable
DROP TABLE "parent_student_links";

-- CreateTable
CREATE TABLE "user_org_role_mapping" (
    "id" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_org_role_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_hostel_role_mapping" (
    "id" SERIAL NOT NULL,
    "hostel_id" INTEGER NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "room_id" INTEGER,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_hostel_role_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_student_mapping" (
    "id" SERIAL NOT NULL,
    "parent_user_id" UUID NOT NULL,
    "student_user_id" UUID NOT NULL,
    "relationship_type" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parent_student_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_org_role_mapping_organization_id_user_id_key" ON "user_org_role_mapping"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_hostel_role_mapping_hostel_id_user_id_key" ON "user_hostel_role_mapping"("hostel_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "parent_student_mapping_parent_user_id_student_user_id_key" ON "parent_student_mapping"("parent_user_id", "student_user_id");

-- AddForeignKey
ALTER TABLE "user_org_role_mapping" ADD CONSTRAINT "user_org_role_mapping_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_org_role_mapping" ADD CONSTRAINT "user_org_role_mapping_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_hostel_role_mapping" ADD CONSTRAINT "user_hostel_role_mapping_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_hostel_role_mapping" ADD CONSTRAINT "user_hostel_role_mapping_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_hostel_role_mapping" ADD CONSTRAINT "user_hostel_role_mapping_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_student_mapping" ADD CONSTRAINT "parent_student_mapping_parent_user_id_fkey" FOREIGN KEY ("parent_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_student_mapping" ADD CONSTRAINT "parent_student_mapping_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
