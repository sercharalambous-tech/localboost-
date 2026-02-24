import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/public/providers/[slug]/reviews?page=1
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 10;

  const profile = await prisma.providerProfile.findUnique({
    where: { slug: params.slug, isPublic: true },
    select: { businessId: true, avgRating: true, reviewCount: true },
  });
  if (!profile) return Response.json({ error: "Provider not found" }, { status: 404 });

  const [reviews, total] = await Promise.all([
    prisma.feedback.findMany({
      where: {
        businessId:  profile.businessId,
        submittedAt: { not: null },
      },
      select: {
        id:          true,
        rating:      true,
        comment:     true,
        submittedAt: true,
        customer: { select: { fullName: true } },
      },
      orderBy: { submittedAt: "desc" },
      skip:   (page - 1) * limit,
      take:   limit,
    }),
    prisma.feedback.count({
      where: { businessId: profile.businessId, submittedAt: { not: null } },
    }),
  ]);

  // Anonymise: "Maria K."
  const safe = reviews.map((r) => {
    const parts = r.customer.fullName.trim().split(" ");
    const name  = parts.length > 1
      ? `${parts[0]} ${parts[parts.length - 1][0]}.`
      : parts[0];
    return {
      id:          r.id,
      rating:      r.rating,
      comment:     r.comment,
      submittedAt: r.submittedAt,
      customerName:name,
    };
  });

  return Response.json({
    reviews: safe,
    total,
    page,
    pages:     Math.ceil(total / limit),
    avgRating: profile.avgRating,
    reviewCount: profile.reviewCount,
  });
}
