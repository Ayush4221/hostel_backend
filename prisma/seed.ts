import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROLES = [
  { id: 0, code: "super_admin", name: "Super Admin" },
  { id: 1, code: "admin", name: "Admin" },
  { id: 2, code: "staff", name: "Staff" },
  { id: 3, code: "student", name: "Student" },
  { id: 4, code: "parent", name: "Parent" },
];

async function main() {
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { id: role.id },
      create: role,
      update: { code: role.code, name: role.name },
    });
  }
  console.log("Roles seeded.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
