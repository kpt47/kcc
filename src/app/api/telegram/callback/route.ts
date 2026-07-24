import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// รับผลจากหน้าจำลองการเชื่อมต่อ Telegram (/telegram/mock-link) เท่านั้น — เส้นทางจริงผูกบัญชีผ่าน
// POST /api/telegram/webhook เมื่อผู้ใช้กด /start ในแชทบอทจริง (Telegram ไม่มี OAuth callback แบบ LINE
// ให้ redirect กลับมาที่นี่ได้ ต้องรอ Update จากบอทเสมอ)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const isMock = url.searchParams.get("mock") === "1";

  if (isMock) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.redirect(new URL("/login", request.url));
    await prisma.user.update({ where: { id: user.id }, data: { telegramChatId: `mock-telegram-${user.id}` } });
    return NextResponse.redirect(new URL("/profile", request.url));
  }

  return NextResponse.redirect(new URL("/profile?telegramError=1", request.url));
}
