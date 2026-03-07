-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role_id" INTEGER;

-- CreateTable
CREATE TABLE "roles" (
    "id" INTEGER NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed roles (fixed IDs per plan: 0=super_admin, 1=admin, 2=staff, 3=student, 4=parent)
INSERT INTO "roles" ("id", "code", "name") VALUES
  (0, 'super_admin', 'Super Admin'),
  (1, 'admin', 'Admin'),
  (2, 'staff', 'Staff'),
  (3, 'student', 'Student'),
  (4, 'parent', 'Parent');
