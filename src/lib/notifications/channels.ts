// ฟังก์ชันสำหรับส่ง SMS/LINE/Telegram แจ้งเตือนครัวเรือนเป้าหมาย
// SMS ยังเป็น Mock (log เท่านั้น) — LINE มอบหมายให้ lib/line/messaging.ts's sendLineNotification, Telegram มอบหมายให้
// lib/telegram/messaging.ts's sendTelegramNotification เพียงจุดเดียวต่อช่องทาง
// (Modular: แยก Service ของแต่ละช่องทางออกจากกันชัดเจน ไม่มี Logic ส่งซ้ำซ้อนหลายที่ในระบบ)

import { prisma } from "@/lib/prisma";
import { sendLineNotification } from "@/lib/line/messaging";
import { sendTelegramNotification } from "@/lib/telegram/messaging";

export type ChannelResult = { success: boolean; channel: "sms" | "line" | "telegram"; detail: string };

export async function sendSms(phoneNumber: string, message: string): Promise<ChannelResult> {
  console.log(`[MOCK SMS] -> ${phoneNumber}: ${message}`);
  return { success: true, channel: "sms", detail: `ส่ง SMS ไปยัง ${phoneNumber} สำเร็จ (จำลอง)` };
}

export async function sendLineMessage(userId: number, message: string): Promise<ChannelResult> {
  const result = await sendLineNotification(userId, message);
  return { success: result.success, channel: "line", detail: result.detail };
}

export async function sendTelegramMessage(userId: number, message: string): Promise<ChannelResult> {
  const result = await sendTelegramNotification(userId, message);
  return { success: result.success, channel: "telegram", detail: result.detail };
}

/** ส่งแจ้งเตือนครัวเรือนผ่านทุกช่องทางที่มีข้อมูลติดต่อ (เบอร์โทร/LINE/Telegram) — ถ้าไม่มีข้อมูลติดต่อเลยจะไม่ส่งอะไร */
export async function notifyHousehold(
  user: { id: number; phoneNumber: string | null; lineId: string | null; telegramChatId: string | null },
  message: string
): Promise<ChannelResult[]> {
  const results: ChannelResult[] = [];
  if (user.phoneNumber) results.push(await sendSms(user.phoneNumber, message));
  if (user.lineId) results.push(await sendLineMessage(user.id, message));
  if (user.telegramChatId) results.push(await sendTelegramMessage(user.id, message));
  return results;
}

/**
 * ส่ง SMS ถึงผู้ใช้งานรายเดียวโดยตรงจาก userId — ดึง phoneNumber ให้อัตโนมัติ (ทุก User บังคับมีเบอร์โทรศัพท์แล้ว)
 * ใช้สำหรับกรณีส่ง SMS เดี่ยวๆ นอกเหนือจากช่องทาง notifyUsers (เช่น การแจ้งเตือนเฉพาะกิจ) — คืนค่า null ถ้าไม่พบผู้ใช้งาน
 */
export async function sendSmsToUser(userId: number, message: string): Promise<ChannelResult | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phoneNumber: true } });
  if (!user) return null;
  return sendSms(user.phoneNumber, message);
}
