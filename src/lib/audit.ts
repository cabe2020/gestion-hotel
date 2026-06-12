import { prisma } from './prisma';

export async function logAction({
  userId,
  action,
  entity,
  entityId = '',
  details = '',
  hotelId,
}: {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  hotelId?: string;
}) {
  return prisma.auditLog.create({
    data: { userId, action, entity, entityId, details, hotelId },
  });
}
