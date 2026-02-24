import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse, AuthError } from "@/lib/auth";
import { IndustryCategory } from "@prisma/client";
import { generateSlug } from "@/lib/provider";

const ProfileSchema = z.object({
  displayName:      z.string().min(1).max(100),
  slug:             z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers and hyphens"),
  bio:              z.string().max(1000).optional().nullable(),
  profileImageUrl:  z.string().url().optional().nullable(),
  coverImageUrl:    z.string().url().optional().nullable(),
  industryCategory: z.nativeEnum(IndustryCategory),
  city:             z.string().max(100).optional().nullable(),
  address:          z.string().max(200).optional().nullable(),
  phone:            z.string().max(30).optional().nullable(),
  instagramUrl:     z.string().url().optional().nullable(),
  facebookUrl:      z.string().url().optional().nullable(),
  websiteUrl:       z.string().url().optional().nullable(),
  isPublic:         z.boolean().optional(),
});

async function getBusiness(userId: string, businessId: string) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, ownerUserId: userId },
    include: { providerProfile: true },
  });
  if (!business) throw new AuthError(403, "Access denied");
  return business;
}

// GET /api/provider-profile?businessId=...
export async function GET(req: NextRequest) {
  try {
    const user       = await requireAuth();
    const businessId = new URL(req.url).searchParams.get("businessId");
    if (!businessId) return Response.json({ error: "businessId required" }, { status: 400 });

    const business = await getBusiness(user.id, businessId);
    return Response.json({ profile: business.providerProfile ?? null });
  } catch (err) {
    return authErrorResponse(err);
  }
}

// POST /api/provider-profile â create
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { businessId, ...fields } = z.object({ businessId: z.string().uuid() }).merge(ProfileSchema).parse(body);

    const business = await getBusiness(user.id, businessId);
    if (business.providerProfile) {
      return Response.json({ error: "Profile already exists â use PATCH" }, { status: 409 });
    }

    // Ensure slug uniqueness
    const slugConflict = await prisma.providerProfile.findUnique({ where: { slug: fields.slug } });
    if (slugConflict) return Response.json({ error: "Slug already taken" }, { status: 409 });

    const profile = await prisma.providerProfile.create({
      data: { businessId, ...fields, avgRating: 0, reviewCount: 0 },
    });

    return Response.json({ profile }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.errors[0].message }, { status: 422 });
    return authErrorResponse(err);
  }
}

// PATCH /api/provider-profile?businessId=...
export async function PATCH(req: NextRequest) {
  try {
    const user       = await requireAuth();
    const businessId = new URL(req.url).searchParams.get("businessId");
    if (!businessId) return Response.json({ error: "businessId required" }, { status: 400 });

    const business = await getBusiness(user.id, businessId);
    if (!business.providerProfile) return Response.json({ error: "Profile not found" }, { status: 404 });

    const body   = await req.json();
    const fields = ProfileSchema.partial().parse(body);

    // Check slug uniqueness if changing
    if (fields.slug && fields.slug !== business.providerProfile.slug) {
      const conflict = await prisma.providerProfile.findUnique({ where: { slug: fields.slug } });
      if (conflict) return Response.json({ error: "Slug already taken" }, { status: 409 });
    }

    const profile = await prisma.providerProfile.update({
      where: { businessId },
      data:  fields,
    });

    return Response.json({ profile });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.errors[0].message }, { status: 422 });
    return authErrorResponse(err);
  }
}

// GET /api/provider-profile/check-slug?slug=...
// (exported as named so we can call it separately)
export async function checkSlugAvailable(slug: string, excludeBusinessId?: string): Promise<boolean> {
  const existing = await prisma.providerProfile.findUnique({
    where: { slug },
    select: { businessId: true },
  });
  if (!existing) return true;
  if (excludeBusinessId && existing.businessId === excludeBusinessId) return true;
  return false;
}
