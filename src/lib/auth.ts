/**
 * Server-side auth helpers.
 * Retrieves the current user from Supabase session cookies
 * and looks up the corresponding User + Business from Postgres.
 */

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// Build a Supabase server client from Next.js cookies
function buildServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
      },
    }
  );
}

/**
 * Get the authenticated Supabase user from the current request.
 * Returns null if not authenticated.
 */
export async function getSupabaseUser() {
  try {
    const supabase = buildServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
}

/**
 * Get the full User record from our DB for the current session.
 */
export async function getCurrentUser() {
  const supabaseUser = await getSupabaseUser();
  if (!supabaseUser) return null;
  return prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
  });
}

/**
 * Get the authenticated user + their primary business.
 * Throws a 401/403 error object if not authenticated or no business access.
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError(401, "Not authenticated");
  }
  return user;
}

/**
 * Require that the user owns (or has admin access to) the given businessId.
 */
export async function requireBusinessAccess(businessId: string) {
  const user = await requireAuth();

  if (user.role === UserRole.ADMIN) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new AuthError(404, "Business not found");
    return { user, business };
  }

  const business = await prisma.business.findFirst({
    where: { id: businessId, ownerUserId: user.id },
  });

  if (!business) {
    throw new AuthError(403, "Access denied");
  }

  return { user, business };
}

/**
 * Get the first business for the current user.
 */
export async function getUserBusiness() {
  const user = await requireAuth();
  const business = await prisma.business.findFirst({
    where: { ownerUserId: user.id },
    include: { billing: true, locations: true },
  });
  return { user, business };
}

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/** Standard JSON error response helper */
export function authErrorResponse(err: unknown): Response {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error("[auth]", err);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
