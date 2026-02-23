import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

interface AuditOptions {
  businessId?: string;
  actorUserId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(opts: AuditOptions): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        businessId: opts.businessId,
        actorUserId: opts.actorUserId,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId,
        metadataJson: opts.metadata ?? {},
      },
    });
  } catch (err) {
    // Audit log failures should never crash the main flow
    console.error("[AuditLog] Failed to write:", err);
  }
}
