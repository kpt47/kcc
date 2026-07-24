// ฟังก์ชันกลางสำหรับสร้าง In-app Notification ให้ผู้ใช้งานหลายคนพร้อมกัน — ใช้ร่วมกันทั้ง
// เวิร์กโฟลว์แจ้งชำระเงินและงาน cron ประจำวัน (repayment-check.ts) เพื่อไม่ให้ตรรกะการแจ้งเตือนกระจัดกระจาย
import { prisma } from "@/lib/prisma";
import { notifyHousehold } from "./channels";
import type { NotificationType } from "@/generated/prisma/client";

/**
 * สร้าง Notification ในระบบให้ผู้ใช้ตาม userIds ที่ระบุ พร้อมพยายามส่ง SMS/LINE/Telegram (mock) เพิ่มเติม
 * ให้ผู้รับที่มีเบอร์โทร/LINE ID/Telegram chat_id บันทึกไว้ — ใช้ได้กับผู้ใช้ทุก role ไม่จำกัดเฉพาะครัวเรือน
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
    select: { id: true, phoneNumber: true, lineId: true, telegramChatId: true },
  });
  for (const recipient of recipients) {
    await notifyHousehold(recipient, message);
  }
}

/**
 * แจ้งเตือนผู้นำหมู่บ้าน — พัฒนากรผู้รับผิดชอบตำบล (SUB_DISTRICT_ADMIN) และประธานกรรมการหมู่บ้าน
 * (VILLAGE_COMMITTEE ที่ committeeRole = CHAIRMAN) ของหมู่บ้านที่ระบุ ใช้เมื่อครัวเรือนยื่นแบบเสนอโครงการ
 * หรือแบบขอยืมเงินทุนใหม่ เพื่อให้ทั้งสองฝ่ายเห็นรายการที่รอพิจารณาทันทีผ่านกระดิ่งแจ้งเตือน
 */
export async function notifyVillageLeadership(villageId: number, message: string, link?: string): Promise<void> {
  const village = await prisma.village.findUnique({ where: { id: villageId }, select: { subDistrictId: true } });
  if (!village) return;

  const recipients = await prisma.user.findMany({
    where: {
      OR: [
        { role: "VILLAGE_COMMITTEE", committeeRole: "CHAIRMAN", scopeVillageId: villageId },
        { role: "SUB_DISTRICT_ADMIN", scopeSubDistrictId: village.subDistrictId },
      ],
    },
    select: { id: true },
  });

  await notifyUsers(
    recipients.map((r) => r.id),
    message,
    "ALERT",
    link
  );
}

/**
 * แจ้งเตือนผู้บริหารอำเภอ (DISTRICT_ADMIN) และผู้บริหารจังหวัด (PROVINCIAL_ADMIN) ที่ดูแลเขตพื้นที่ของหมู่บ้าน
 * ที่ระบุ — ใช้เมื่อครัวเรือนส่งคำร้อง "ปรึกษา/ร้องทุกข์" ใหม่ (ไม่ใช้ scope.ts เพราะฟังก์ชันนั้นคืนรายชื่อ
 * villageId ทั้งหมดที่ผู้ใช้คนหนึ่งมองเห็น — ที่นี่ต้องการทิศทางตรงข้าม คือหาผู้ใช้ทั้งหมดที่มองเห็นหมู่บ้านหนึ่งๆ)
 */
export async function notifyDistrictAndProvinceAdmins(villageId: number, message: string, link?: string): Promise<void> {
  const village = await prisma.village.findUnique({
    where: { id: villageId },
    select: { subDistrict: { select: { districtId: true, district: { select: { provinceId: true } } } } },
  });
  if (!village) return;
  const { districtId, district } = village.subDistrict;

  const recipients = await prisma.user.findMany({
    where: {
      OR: [
        { role: "DISTRICT_ADMIN", scopeDistrictId: districtId },
        { role: "PROVINCIAL_ADMIN", scopeProvinceId: district.provinceId },
      ],
    },
    select: { id: true },
  });

  await notifyUsers(
    recipients.map((r) => r.id),
    message,
    "ALERT",
    link
  );
}
