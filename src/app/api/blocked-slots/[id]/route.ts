import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse, AuthError } from "@/lib/auth";

// DELETE /api/blocked-slots/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const slot = await prisma.blockedSlot.findFirst({
      where: { id: params.id },
      include: { business: true },
    });
    if (!slot || slot.business.ownerUserId !== user.id) throw new AuthError(403, "Access denied");
    await prisma.blockedSlot.delete({ where: { id: params.id } });
    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
