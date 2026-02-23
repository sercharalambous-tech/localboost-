import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse, AuthError } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { randomUUID } from "crypto";

const CreateSchema = z.object({
  businessId: z.string().uuid(),
  fullName: z.string().min(1).max(150),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  consentSms: z.boolean().default(false),
  consentEmail: z.boolean().default(false),
  consentSource: z.string().default("manual"),
});

// GET /api/customers?businessId=...&page=1&q=search
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    const q = searchParams.get("q") ?? "";
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = 25;

    if (!businessId) return Response.json({ error: "businessId required" }, { status: 400 });

    const business = await prisma.business.findFirst({ where: { id: businessId, ownerUserId: user.id } });
    if (!business) return Response.json({ error: "Access denied" }, { status: 403 });

    const where: any = {
      businessId,
      deletedAt: null,
      ...(q && {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      }),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { _count: { select: { appointments: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return Response.json({ customers, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    return authErrorResponse(err);
  }
}

// POST /api/customers
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = CreateSchema.parse(body);

    const business = await prisma.business.findFirst({ where: { id: data.businessId, ownerUserId: user.id } });
    if (!business) throw new AuthError(403, "Access denied");

    const customer = await prisma.customer.create({
      data: {
        id: randomUUID(),
        businessId: data.businessId,
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        consentSms: data.consentSms,
        consentEmail: data.consentEmail,
        consentSource: data.consentSource,
        consentTimestamp: (data.consentSms || data.consentEmail) ? new Date() : undefined,
      },
    });

    await createAuditLog({
      businessId: data.businessId,
      actorUserId: user.id,
      action: "create",
      entity: "customer",
      entityId: customer.id,
    });

    return Response.json({ customer }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.errors[0].message }, { status: 422 });
    return authErrorResponse(err);
  }
}
