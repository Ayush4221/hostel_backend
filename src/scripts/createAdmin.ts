import "dotenv/config";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma.js";
import { ROLE_ID_SUPER_ADMIN } from "../config/roles.js";
import { createLogger } from "../utils/logger.js";
import {
  ADMIN_ALREADY_EXISTS,
  SUPER_ADMIN_CREATED,
  ERROR_CREATING_ADMIN_USER,
} from "../utils/constants/messages.js";

const log = createLogger("createAdmin");

const createAdminUser = async () => {
  try {
    await prisma.$connect();

    const adminData = {
      email: "admin@hms.com",
      password: "admin123",
      firstName: "Admin",
      lastName: "User",
    };

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminData.email },
    });

    if (existingAdmin) {
      log.info(ADMIN_ALREADY_EXISTS);
      return;
    }

    const passwordHash = await bcrypt.hash(adminData.password, 10);
    const jwtSecret = crypto.randomBytes(32).toString("hex");

    await prisma.user.create({
      data: {
        email: adminData.email,
        passwordHash,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        roleId: ROLE_ID_SUPER_ADMIN,
        jwtSecret,
      },
    });

    log.info(SUPER_ADMIN_CREATED);
    log.info({ email: adminData.email, password: adminData.password }, "Credentials");
  } catch (error) {
    log.error({ err: error }, ERROR_CREATING_ADMIN_USER);
  } finally {
    await prisma.$disconnect();
  }
};

createAdminUser();
