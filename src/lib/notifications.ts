import { prisma } from "./prisma";

export async function createNotification({
  userId,
  title,
  message,
  type = "info",
  hotelId,
}: {
  userId: string;
  title: string;
  message: string;
  type?: string;
  hotelId?: string;
}) {
  return prisma.notification.create({
    data: { userId, title, message, type, hotelId },
  });
}

export async function notifyRole({
  role,
  hotelId,
  title,
  message,
  type = "info",
}: {
  role: string;
  hotelId: string;
  title: string;
  message: string;
  type?: string;
}) {
  const users = await prisma.user.findMany({
    where: { role, active: true, hotelId },
  });
  return Promise.all(
    users.map((u) =>
      prisma.notification.create({
        data: { userId: u.id, title, message, type, hotelId },
      })
    )
  );
}
