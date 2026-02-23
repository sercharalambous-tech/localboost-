import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

const Schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  supabaseId: z.string(),
});

// Called during signup to create the User row in our DB
export async function POST(req: NextRequest) {
  try {
    const { name, email, supabaseId } = Schema.parse(await req.json());

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { supabaseId }] },
    });
    if (existing) return Response.json({ user: existing });

    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        supabaseId,
        name,
        email,
        role: "OWNER",
      },
    });

    return Response.json({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.errors[0].message }, { status: 422 });
    console.error("[register]", err);
    return Response.json({ error: "Registration failed" }, { status: 500 });
  }
}
