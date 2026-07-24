import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// เริ่มกระบวนการเชื่อมต่อบัญชี Telegram — ถ้าตั้งค่า TELEGRAM_BOT_USERNAME จริงไว้แล้ว จะสร้างโทเค็นผูกบัญชีชั่วคราว
// (เก็บไว้ที่ User.telegramLinkToken) แล้วพาไปที่ลิงก์แชทบอท (t.me/<bot>?start=<token>) ผู้ใช้กด "เริ่ม" ในแอป
// Telegram ของตัวเอง บอทจะได้รับคำสั่ง /start <token> ผ่าน POST /api/telegram/webhook แล้วผูก chat_id ให้อัตโนมัติ
// ต่างจาก LINE Login ตรงที่ Telegram ไม่มีหน้า OAuth ให้ redirect กลับมาเอง ต้องรอผู้ใช้เริ่มแชทกับบอทก่อนเสมอ
// มิฉะนั้น (โหมดพัฒนา/ทดสอบ ยังไม่ได้ตั้งค่าบอทจริง) จะ redirect ไปหน้ายืนยันจำลอง
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  if (botUsername) {
    const token = crypto.randomUUID();
    await prisma.user.update({ where: { id: user.id }, data: { telegramLinkToken: token } });
    return NextResponse.redirect(`https://t.me/${botUsername}?start=${token}`);
  }

  console.log("[telegram/link] TELEGRAM_BOT_USERNAME ยังไม่ได้ตั้งค่า — ใช้หน้ายืนยันจำลอง (โหมดพัฒนา/ทดสอบ)");
  return NextResponse.redirect(new URL("/telegram/mock-link", request.url));
}
