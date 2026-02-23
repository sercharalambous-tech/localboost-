import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse, AuthError } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

const UpdateSchema = z.object({
  fullName: z.string().min(1).max(150).optional(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  consentSms: z.boolean().optional(),
  consentEmail: z.boolean().optional(),
  consentSource: z.string().optional(),
});

async function getCustomerWithAccess(id: string, userId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { business: { select: { ownerUserId: true, id: true } } },
  });
  if (!customer || customer.deletedAt) throw new AuthError(404, "Customer not found");
  if (customer.business.ownerUserId !== userId) throw new AuthError(403, "Access denied");
  return customer;
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const customer = await getCustomerWithAccess(params.id, user.id);
    return Response.json({ customer });
  } catch (err) { return authErrorResponse(err); }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const customer = await getCustomerWithAccess(params.id, user.id);
    const body = await req.json();
    const data = UpdateSchema.parse(body);

    const updated = await prisma.customer.update({
      where: { id: params.id },
      data: {
        ...data,
        ...((data.consentSms || data.consentEmail) ? { consentTimestamp: new Date() } : {}),
      },
    });

    await createAuditLog({ businessId: customer.business.id, actorUserId: user.id, action: "update", entity: "customer", entityId: params.id });
    return Response.json({ customer: updated });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.errors[0].message }, { status: 422 });
    return authErrorResponse(err);
  }
}

// Soft-delete
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const customer = await getCustomerWithAccess(params.id, user.id);

    await prisma.customer.update({
      where: { id: params.id },
      data: { deletedAt: new Date(), phone: null, email: null }, // data minimization
    });

    await createAuditLog({ businessId: customer.business.id, actorUserId: user.id, action: "delete", entity: "customer", entityId: params.id });
    return Response.json({ success: true });
  } catch (err) { return authErrorResponse(err); }
}
