import { prisma } from "./prisma.js";

export async function logActivity(
  type: string,
  message: string,
  entity?: string,
  entityId?: string
) {
  await prisma.activity.create({
    data: { type, message, entity, entityId },
  });
}
