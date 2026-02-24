import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse, AuthError } from "@/lib/auth";

const ServiceSchema = z.object({
  name:            z.string().min(1).max(100),
  description:     z.string().max(500).optional(),
  durationMinutes: z.number().int().min(5).max(480),
  price:           z.number().min(0).max(9999),
  currency:        z.string().length(3).default("EUR"),
  isActive:        z.boolean().default(true),
  sortOrder:       z.number().int().default(0),
});

// GET /api/services?businessId=...
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const businessId = new URL(req.url).searchParams.get("businessId");
    if (!businessId) return Response.json({ error: "businessId required" }, { status: 400 });

    const business = await prisma.business.findFirst({ where: { id: businessId, ownerUserId: user.id } });
    if (!business) return Response.json({ error: "Access denied" }, { status: 403 });

    const services = await prisma.service.findMany({
      where: { businessId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return Response.json({ services });
  } catch (err) {
    return authErrorResponse(err);
  }
}

// POST /api/services
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { businessId, ...fields } = z.object({ businessId: z.string().uuid() }).merge(ServiceSchema).parse(body);

    const business = await prisma.business.findFirst({
      where: { id: businessId, ownerUserId: user.id },
      include: { providerProfile: true },
    });
    if (!business) throw new AuthError(403, "Access denied");
    if (!business.providerProfile) {
      return Response.json({ error: "Create a provider profile first" }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: {
        businessId,
        profileId:       business.providerProfile.id,
        name:            fields.name,
        description:     fields.description,
        durationMinutes: fields.durationMinutes,
        price:           fields.price,
        currency:        fields.currency ?? "EUR",
        isActive:        fields.isActive ?? true,
        sortOrder:       fields.sortOrder ?? 0,
      },
    });

    return Response.json({ service }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.errors[0].message }, { status: 422 });
    return authErrorResponse(err);
  }
}
