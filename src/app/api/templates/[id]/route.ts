import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse, AuthError } from "@/lib/auth";

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  subject: z.string().max(200).optional().nullable(),
  body: z.string().min(1).max(2000).optional(),
  channel: z.enum(["SMS", "EMAIL", "BOTH"]).optional(),
  language: z.enum(["EN", "EL"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const template = await prisma.messageTemplate.findUnique({
      where: { id: params.id },
      include: { business: { select: { ownerUserId: true } } },
    });
    if (!template) return Response.json({ error: "Not found" }, { status: 404 });
    if (template.business.ownerUserId !== user.id) throw new AuthError(403, "Access denied");

    const data = UpdateSchema.parse(await req.json());
    const updated = await prisma.messageTemplate.update({ where: { id: params.id }, data });
    return Response.json({ template: updated });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.errors[0].message }, { status: 422 });
    return authErrorResponse(err);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const template = await prisma.messageTemplate.findUnique({
      where: { id: params.id },
      include: { business: { select: { ownerUserId: true } } },
    });
    if (!template) return Response.json({ error: "Not found" }, { status: 404 });
    if (template.business.ownerUserId !== user.id) throw new AuthError(403, "Access denied");

    await prisma.messageTemplate.delete({ where: { id: params.id } });
    return Response.json({ success: true });
  } catch (err) { return authErrorResponse(err); }
}
