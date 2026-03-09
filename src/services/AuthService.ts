import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma.js";
import type {
  LoginRequestDto,
  LoginResponseDto,
  UserResponseDto,
  RefreshResponseDto,
  OrgSignupRequestDto,
  OrgSignupResponseDto,
} from "../dto/auth.dto.js";
import { createRefreshToken, getUserIdByRefreshToken, rotateRefreshToken, deleteRefreshToken } from "./RefreshTokenService.js";
import { getAccessTokenExpirySeconds } from "../config/jwt.js";
import { ROLE_ID_ADMIN, ROLE_CODE_TO_ID } from "../config/roles.js";
import { OrganizationDAO } from "../dao/OrganizationDAO.js";
import { UserHostelRoleMappingDAO } from "../dao/UserHostelRoleMappingDAO.js";

const organizationDAO = new OrganizationDAO();
const userHostelRoleMappingDAO = new UserHostelRoleMappingDAO();

/** Resolve organizationId for JWT: org mapping, then hostel mapping (staff/student), then parent→student's hostel. */
async function resolveOrganizationIdForUser(userId: string): Promise<string | undefined> {
  const orgMapping = await organizationDAO.findFirstByUserId(userId);
  if (orgMapping?.organizationId) return orgMapping.organizationId;
  const hostelMapping = await userHostelRoleMappingDAO.findFirstByUserId(userId);
  if (hostelMapping?.hostel?.organizationId) return hostelMapping.hostel.organizationId;
  // Parent: get org from a linked student's hostel
  const parentLink = await prisma.parentStudentMapping.findFirst({
    where: { parentUserId: userId },
    include: {
      student: {
        include: {
          userHostelRoleMappings: {
            take: 1,
            include: { hostel: { select: { organizationId: true } } },
          },
        },
      },
    },
  });
  const studentHostel = parentLink?.student?.userHostelRoleMappings?.[0]?.hostel;
  if (studentHostel?.organizationId) return studentHostel.organizationId;
  return undefined;
}

const userIncludeRole = { include: { roleRelation: true } } as const;

function getRoleCode(user: { roleRelation?: { code: string } | null; role?: string | null }): string {
  return user.roleRelation?.code ?? user.role ?? "student";
}

function getRoleId(user: { roleRelation?: { id: number } | null; role?: string | null }): number | undefined {
  if (user.roleRelation?.id != null) return user.roleRelation.id;
  if (user.role && user.role in ROLE_CODE_TO_ID) return ROLE_CODE_TO_ID[user.role];
  return undefined;
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "org";
}

function buildUserResponseDto(
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role?: string | null;
    roleRelation?: { code: string; id: number } | null;
  },
  roleCode?: string,
  roleId?: number,
  organizationId?: string
): UserResponseDto {
  const code = roleCode ?? getRoleCode(user);
  const id = roleId ?? getRoleId(user);
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: code,
    ...(id !== undefined && { roleId: id }),
    ...(organizationId !== undefined && { organizationId }),
  };
}

function signAccessToken(
  userId: string,
  role: string,
  secret: string,
  organizationId?: string
): { token: string; expiresIn: number } {
  const expiresIn = getAccessTokenExpirySeconds();
  const payload: { userId: string; role: string; organizationId?: string } = { userId, role };
  if (organizationId) payload.organizationId = organizationId;
  const token = jwt.sign(payload, secret, { expiresIn });
  return { token, expiresIn };
}

export class AuthService {
  async login(body: LoginRequestDto): Promise<{ status: number; json: LoginResponseDto | { message: string } }> {
    const user = await prisma.user.findUnique({
      where: { email: body.email.trim().toLowerCase() },
      ...userIncludeRole,
    });
    if (!user) {
      return { status: 401, json: { message: "Invalid user" } };
    }
    const isMatch = await bcrypt.compare(body.password, user.passwordHash);
    if (!isMatch) {
      return { status: 401, json: { message: "Invalid credentials" } };
    }

    let secret = user.jwtSecret;
    if (!secret || secret.length === 0) {
      secret = crypto.randomBytes(32).toString("hex");
      await prisma.user.update({
        where: { id: user.id },
        data: { jwtSecret: secret },
      });
    }

    const roleCode = getRoleCode(user);
    const roleId = getRoleId(user);
    const organizationId = await resolveOrganizationIdForUser(user.id);
    const { token: accessToken, expiresIn } = signAccessToken(user.id, roleCode, secret, organizationId);
    const refreshToken = await createRefreshToken(user.id);

    const userData = buildUserResponseDto(user, roleCode, roleId, organizationId);
    return {
      status: 200,
      json: { accessToken, refreshToken, expiresIn, user: userData },
    };
  }

  async refresh(refreshToken: string): Promise<{ status: number; json: RefreshResponseDto | { message: string } }> {
    const userId = await getUserIdByRefreshToken(refreshToken);
    if (!userId) {
      return { status: 401, json: { message: "Invalid or expired refresh token" } };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      ...userIncludeRole,
    });
    if (!user?.jwtSecret) {
      return { status: 401, json: { message: "Invalid or expired refresh token" } };
    }

    const newRefreshToken = await rotateRefreshToken(userId, refreshToken);
    const roleCode = getRoleCode(user);
    const roleId = getRoleId(user);
    const organizationId = await resolveOrganizationIdForUser(user.id);
    const { token: accessToken, expiresIn } = signAccessToken(user.id, roleCode, user.jwtSecret, organizationId);

    return {
      status: 200,
      json: { accessToken, refreshToken: newRefreshToken, expiresIn },
    };
  }

  async logout(refreshToken: string): Promise<{ status: number }> {
    await deleteRefreshToken(refreshToken);
    return { status: 200 };
  }

  async orgSignup(
    body: OrgSignupRequestDto
  ): Promise<{ status: number; json: OrgSignupResponseDto | { message: string } }> {
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email.trim().toLowerCase() },
    });
    if (existingUser) {
      return { status: 400, json: { message: "Email already registered" } };
    }

    const slug = slugify(body.orgName);
    const existingOrg = await prisma.organization.findUnique({ where: { slug } });
    if (existingOrg) {
      return { status: 400, json: { message: "An organization with this name already exists" } };
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const jwtSecret = crypto.randomBytes(32).toString("hex");

    const org = await prisma.organization.create({
      data: { name: body.orgName.trim(), slug, status: "active" },
    });

    const user = await prisma.user.create({
      data: {
        email: body.email.trim().toLowerCase(),
        passwordHash,
        firstName: body.firstName,
        lastName: body.lastName,
        role: "admin",
        roleId: ROLE_ID_ADMIN,
        jwtSecret,
      },
      ...userIncludeRole,
    });

    await prisma.userOrgRoleMapping.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: "org_admin",
        status: "active",
      },
    });

    const roleCode = getRoleCode(user);
    const roleId = getRoleId(user);
    const { token: accessToken, expiresIn } = signAccessToken(user.id, roleCode, jwtSecret, org.id);
    const refreshToken = await createRefreshToken(user.id);
    const userData = buildUserResponseDto(user, roleCode, roleId, org.id);

    return {
      status: 201,
      json: {
        accessToken,
        refreshToken,
        expiresIn,
        user: userData,
        organization: { id: org.id, name: org.name, slug: org.slug },
      },
    };
  }
}
