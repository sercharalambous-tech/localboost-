import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse, AuthError } from "@/lib/auth";

const UpdateSchema = z.object({
  name:            z.string().min(1).max(100).optional(),
  description:     z.string().max(500).optional().nullable(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  price:           z.number().min(0).max(9999).optional(),
  isActive:        z.boolean().optional(),
  sortOrder:       z.number().int().optional(),
});

async function getServiceOrDeny(id: string, userId: string) {
  const service = await prisma.service.findFirst({
    where: { id },
    include: { business: true },
  });
  if (!service || service.business.ownerUserId !== userId) {
    throw new AuthError(403, "Access denied");
  }
  return service;
}

// PATCH /api/services/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user    = await requireAuth();
    await getServiceOrDeny(params.id, user.id);
    const body    = await req.json();
    const data    = UpdateSchema.parse(body);
    const service = await prisma.service.update({ where: { id: params.id }, data });
    return Response.json({ service });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.errors[0].message }, { status: 422 });
    return authErrorResponse(err);
  }
}

// DELETE /api/services/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    await getServiceOrDeny(params.id, user.id);
    await prisma.service.delete({ where: { id: params.id } });
    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
