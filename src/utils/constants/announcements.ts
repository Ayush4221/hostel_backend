/**
 * Target audience for announcements. Use these enum values instead of raw strings.
 * Stored in DB as lowercase (e.g. "all", "students"); API may accept either.
 */
export enum AnnouncementTargetAudience {
  ALL = "all",
  STUDENTS = "students",
  STAFF = "staff",
  PARENTS = "parents",
  STUDENTS_STAFF = "students_staff",
  STUDENTS_PARENTS = "students_parents",
  STAFF_PARENTS = "staff_parents",
}

/** Audience values that include students (for filtering student-visible announcements). */
export const STUDENT_VISIBLE_AUDIENCES: string[] = [
  AnnouncementTargetAudience.ALL,
  AnnouncementTargetAudience.STUDENTS,
  AnnouncementTargetAudience.STUDENTS_STAFF,
  AnnouncementTargetAudience.STUDENTS_PARENTS,
];

/** Audience values that include staff. */
export const STAFF_VISIBLE_AUDIENCES: string[] = [
  AnnouncementTargetAudience.ALL,
  AnnouncementTargetAudience.STAFF,
  AnnouncementTargetAudience.STUDENTS_STAFF,
  AnnouncementTargetAudience.STAFF_PARENTS,
];

/** Audience values that include parents. */
export const PARENT_VISIBLE_AUDIENCES: string[] = [
  AnnouncementTargetAudience.ALL,
  AnnouncementTargetAudience.PARENTS,
  AnnouncementTargetAudience.STUDENTS_PARENTS,
  AnnouncementTargetAudience.STAFF_PARENTS,
];

const ALL_VALUES = Object.values(AnnouncementTargetAudience) as string[];

export function isValidTargetAudience(value: string): value is AnnouncementTargetAudience {
  return ALL_VALUES.includes(value);
}

export function normalizeTargetAudience(value: string): string {
  const lower = value.toLowerCase().trim();
  return isValidTargetAudience(lower) ? lower : AnnouncementTargetAudience.ALL;
}
