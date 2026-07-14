// ฟังก์ชันกลางสำหรับสร้าง In-app Notification ให้ผู้ใช้งานหลายคนพร้อมกัน — ใช้ร่วมกันทั้ง
// เวิร์กโฟลว์แจ้งชำระเงินและงาน cron ประจำวัน (repayment-check.ts) เพื่อไม่ให้ตรรกะการแจ้งเตือนกระจัดกระจาย
import { prisma } from "@/lib/prisma";
import { notifyHousehold } from "./channels";
import type { NotificationType } from "@/generated/prisma/client";

/**
 * สร้าง Notification ในระบบให้ผู้ใช้ตาม userIds ที่ระบุ พร้อมพยายามส่ง SMS/LINE (mock) เพิ่มเติม
 * ให้ผู้รับที่มีเบอร์โทร/LINE ID บันทึกไว้ — ใช้ได้กับผู้ใช้ทุก role ไม่จำกัดเฉพาะครัวเรือน
 */
export async function notifyUsers(
  userIds: number[],
  message: string,
  type: NotificationType,
  link?: string
): Promise<void> {
  if (userIds.length === 0) return;

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, message, type, link })),
  });

  const recipients = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, phoneNumber: true, lineId: true },
  });
  for (const recipient of recipients) {
    await notifyHousehold(recipient, message);
  }
}
