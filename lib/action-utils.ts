import { auth } from "@/auth";

export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  /** Field-level errors returned from server-side zod validation. */
  fieldErrors?: Record<string, string[]>;
  data?: T;
};

export function ok<T>(message?: string, data?: T): ActionResult<T> {
  return { success: true, message, data };
}

export function fail<T = undefined>(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<T> {
  return { success: false, message, fieldErrors };
}

export type SessionUser = {
  id: number;
  organizationId: number | null;
  roleSlug: string | null;
};

/**
 * Returns the authenticated user's id + organization scope or throws.
 * Use inside every server action after input validation.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return {
    id: Number(session.user.id),
    organizationId: session.user.organizationId,
    roleSlug: session.user.roleSlug,
  };
}

/**
 * Builds an organization WHERE clause: users with an organization only see
 * their own organization's data; platform-level users (org = null) see all.
 */
export function orgScope(user: SessionUser) {
  return user.organizationId != null ? { organizationId: user.organizationId } : {};
}
