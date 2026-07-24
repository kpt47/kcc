import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Webhook รับ Update จาก Telegram Bot API จริง (ตั้งค่าผ่าน https://api.telegram.org/bot<token>/setWebhook)
// ต่างจาก LINE ที่ผูกบัญชีผ่าน OAuth callback ได้เลย — Telegram ต้องให้ผู้ใช้กด /start ในแชทบอทก่อน ระบบจึงจะรู้ chat_id
// จับคู่ผู้ใช้ด้วยโทเค็นที่แนบมากับลิงก์ (t.me/<bot>?start=<token>) ที่สร้างไว้ตอนกด "เชื่อมต่อ Telegram" ในหน้าโปรไฟล์
// (ดู GET /api/telegram/link) ตรวจสอบ secret token (ถ้าตั้งค่า TELEGRAM_WEBHOOK_SECRET ไว้) กัน endpoint นี้
// ถูกเรียกจากที่อื่นที่ไม่ใช่ Telegram จริง
export async function POST(request: Request) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret) {
    const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token");
    if (receivedSecret !== webhookSecret) {
      return NextResponse.json({ error: "invalid secret token" }, { status: 401 });
    }
  }

  const body = await request.json().catch(() => null);
  const message = body?.message;
  const text: string | undefined = message?.text;
  const chatId: number | undefined = message?.chat?.id;

  if (text?.startsWith("/start") && chatId) {
    const token = text.replace("/start", "").trim();
    if (token) {
      const user = await prisma.user.findUnique({ where: { telegramLinkToken: token } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { telegramChatId: String(chatId), telegramLinkToken: null },
        });

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (botToken) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: "เชื่อมต่อบัญชีระบบ กข.คจ. สำเร็จแล้ว ✅" }),
          }).catch(() => {});
        }
      }
    }
  }

  // ต้องตอบ 200 เสมอและเร็ว มิฉะนั้น Telegram จะพยายามส่ง Update เดิมซ้ำ
  return NextResponse.json({ ok: true });
}
