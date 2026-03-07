/**
 * Numeric role IDs (from roles table). Use these instead of magic numbers.
 */
export const ROLE_ID_SUPER_ADMIN = 0;
export const ROLE_ID_ADMIN = 1;
export const ROLE_ID_STAFF = 2;
export const ROLE_ID_STUDENT = 3;
export const ROLE_ID_PARENT = 4;

export const ROLE_CODES = {
  [ROLE_ID_SUPER_ADMIN]: "super_admin",
  [ROLE_ID_ADMIN]: "admin",
  [ROLE_ID_STAFF]: "staff",
  [ROLE_ID_STUDENT]: "student",
  [ROLE_ID_PARENT]: "parent",
} as const;

/** Role codes that are allowed to register (no super_admin). */
export const REGISTERABLE_ROLE_CODES = ["admin", "staff", "student", "parent"] as const;

/** Map role code to role id (for legacy user.role string). */
export const ROLE_CODE_TO_ID: Record<string, number> = {
  super_admin: ROLE_ID_SUPER_ADMIN,
  admin: ROLE_ID_ADMIN,
  staff: ROLE_ID_STAFF,
  student: ROLE_ID_STUDENT,
  parent: ROLE_ID_PARENT,
};
