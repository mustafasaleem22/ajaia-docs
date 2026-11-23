// Pure access-control logic. Kept free of I/O so it is easy to unit test.
export type Role = "owner" | "editor" | "viewer";
export type ShareRole = "editor" | "viewer";

export function isShareRole(value: unknown): value is ShareRole {
  return value === "editor" || value === "viewer";
}

/** Work out what a user may do with a document. null means no access. */
export function resolveRole(
  ownerId: number,
  userId: number,
  shareRole?: string | null,
): Role | null {
  if (ownerId === userId) return "owner";
  if (isShareRole(shareRole)) return shareRole;
  return null;
}

export const canEdit = (role: Role | null): boolean =>
  role === "owner" || role === "editor";

export const canManageSharing = (role: Role | null): boolean => role === "owner";
