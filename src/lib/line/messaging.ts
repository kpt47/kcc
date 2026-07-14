import { prisma } from "@/lib/prisma";

// จุดเดียวสำหรับส่งข้อความแจ้งเตือนผ่าน LINE Messaging API (แทนที่ LINE Notify ที่ปิดให้บริการถาวรแล้ว
// ตั้งแต่ 31 มี.ค. 2568) — lib/notifications/channels.ts's sendLineMessage เรียกใช้ฟังก์ชันนี้เพียงทางเดียว
// เพื่อไม่ให้มี Logic ส่ง LINE ซ้ำซ้อนหลายที่ในระบบ
// หากยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN (โหมดพัฒนา/ทดสอบ) จะ log จำลองผลลัพธ์แทนการเรียก API จริง
export type LineSendResult = { success: boolean; detail: string };

export async function sendLineNotification(userId: number, message: string): Promise<LineSendResult> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { lineId: true } });
  if (!user?.lineId) {
    return { success: false, detail: "ผู้ใช้งานนี้ยังไม่ได้เชื่อมต่อบัญชี LINE" };
  }

  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) {
    console.log(`[MOCK LINE Messaging API] -> ${user.lineId}: ${message}`);
    return { success: true, detail: `ส่ง LINE ไปยัง ${user.lineId} สำเร็จ (จำลอง)` };
  }

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ to: user.lineId, messages: [{ type: "text", text: message }] }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[LINE Messaging API] push ล้มเหลว (${res.status}): ${detail}`);
      return { success: false, detail: `ส่ง LINE ไปยัง ${user.lineId} ไม่สำเร็จ` };
    }
    return { success: true, detail: `ส่ง LINE ไปยัง ${user.lineId} สำเร็จ` };
  } catch (err) {
    console.error("[LINE Messaging API] เรียก API ล้มเหลว", err);
    return { success: false, detail: `ส่ง LINE ไปยัง ${user.lineId} ไม่สำเร็จ` };
  }
}
