import { prisma } from "../db/prisma.js";
import type { User, Prisma } from "@prisma/client";

export interface CreateUserDAO {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role?: string;
  roleId?: number;
  phone?: string | null;
  profilePicUrl?: string | null;
  jwtSecret?: string | null;
}

export class UserDAO {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  async findByRole(id: string, role: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { id, role },
    });
  }

  async findManyByRole(role: string) {
    return prisma.user.findMany({
      where: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profilePicUrl: true,
        role: true,
        roleId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findManyByRoles(roles: string[]) {
    return prisma.user.findMany({
      where: { role: { in: roles } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
  }

  async findManyByRolesPaginated(roles: string[], skip: number, take: number) {
    return prisma.user.findMany({
      where: { role: { in: roles } },
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
  }

  async findManyByRolePaginated(role: string, skip: number, take: number) {
    return prisma.user.findMany({
      where: { role },
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profilePicUrl: true,
        role: true,
        roleId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async countByRole(role: string): Promise<number> {
    return prisma.user.count({ where: { role } });
  }

  async countByRoles(roles: string[]): Promise<number> {
    return prisma.user.count({ where: { role: { in: roles } } });
  }

  async create(data: CreateUserDAO): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role ?? undefined,
        roleId: data.roleId ?? undefined,
        phone: data.phone ?? undefined,
        profilePicUrl: data.profilePicUrl ?? undefined,
        jwtSecret: data.jwtSecret ?? undefined,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.UserUpdateInput
  ): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async updatePassword(id: string, passwordHash: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  async delete(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id },
    });
  }
}
