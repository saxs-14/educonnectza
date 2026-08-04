/**
 * Whether `user` may access a resource scoped to `resourceSchoolId`.
 * DevAdmins bypass school scoping entirely; a null/undefined resourceSchoolId
 * marks a global (unscoped) resource that anyone may access.
 */
export const isSameSchool = (user, resourceSchoolId) => {
  if (user.role === 'DevAdmin') return true;
  if (resourceSchoolId === null || resourceSchoolId === undefined) return true;
  if (user.schoolId === null || user.schoolId === undefined) return false;
  return String(user.schoolId) === String(resourceSchoolId);
};
