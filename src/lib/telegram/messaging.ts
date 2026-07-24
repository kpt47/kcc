import { prisma } from "@/lib/prisma";

// จุดเดียวสำหรับส่งข้อความแจ้งเตือนผ่าน Telegram Bot API — lib/notifications/channels.ts's sendTelegramMessage
// เรียกใช้ฟังก์ชันนี้เพียงทางเดียว เพื่อไม่ให้มี Logic ส่ง Telegram ซ้ำซ้อนหลายที่ในระบบ (เหมือนแนวทางของ LINE)
// หากยังไม่ได้ตั้งค่า TELEGRAM_BOT_TOKEN (โหมดพัฒนา/ทดสอบ) จะ log จำลองผลลัพธ์แทนการเรียก API จริง
export type TelegramSendResult = { success: boolean; detail: string };

export async function sendTelegramNotification(userId: number, message: string): Promise<TelegramSendResult> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { telegramChatId: true } });
  if (!user?.telegramChatId) {
    return { success: false, detail: "ผู้ใช้งานนี้ยังไม่ได้เชื่อมต่อบัญชี Telegram" };
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.log(`[MOCK Telegram Bot API] -> ${user.telegramChatId}: ${message}`);
    return { success: true, detail: `ส่ง Telegram ไปยัง ${user.telegramChatId} สำเร็จ (จำลอง)` };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: user.telegramChatId, text: message }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[Telegram Bot API] sendMessage ล้มเหลว (${res.status}): ${detail}`);
      return { success: false, detail: `ส่ง Telegram ไปยัง ${user.telegramChatId} ไม่สำเร็จ` };
    }
    return { success: true, detail: `ส่ง Telegram ไปยัง ${user.telegramChatId} สำเร็จ` };
  } catch (err) {
    console.error("[Telegram Bot API] เรียก API ล้มเหลว", err);
    return { success: false, detail: `ส่ง Telegram ไปยัง ${user.telegramChatId} ไม่สำเร็จ` };
  }
}
