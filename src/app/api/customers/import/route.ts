import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse, AuthError } from "@/lib/auth";
import { parseCSV } from "@/lib/utils";
import { randomUUID } from "crypto";

const Schema = z.object({
  businessId: z.string().uuid(),
  csv: z.string(),
});

// Expected CSV columns: full_name, phone, email, consent_sms, consent_email
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { businessId, csv } = Schema.parse(await req.json());

    const business = await prisma.business.findFirst({ where: { id: businessId, ownerUserId: user.id } });
    if (!business) throw new AuthError(403, "Access denied");

    const rows = parseCSV(csv);
    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
      const fullName = row["full_name"] || row["name"] || row["fullname"];
      if (!fullName) { skipped++; continue; }

      const phone = row["phone"] || row["mobile"] || null;
      const email = row["email"] || null;
      if (!phone && !email) { skipped++; continue; }

      const consentSms = ["true", "yes", "1"].includes((row["consent_sms"] || "").toLowerCase());
      const consentEmail = ["true", "yes", "1"].includes((row["consent_email"] || "").toLowerCase());

      await prisma.customer.create({
        data: {
          id: randomUUID(),
          businessId,
          fullName,
          phone: phone || undefined,
          email: email || undefined,
          consentSms,
          consentEmail,
          consentSource: "csv_import",
          consentTimestamp: (consentSms || consentEmail) ? new Date() : undefined,
        },
      }).catch(() => skipped++); // skip duplicates

      imported++;
    }

    return Response.json({ imported, skipped, total: rows.length });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.errors[0].message }, { status: 422 });
    return authErrorResponse(err);
  }
}
