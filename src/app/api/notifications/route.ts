import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// รายการแจ้งเตือนของผู้ใช้ปัจจุบัน (สำหรับกระดิ่งแจ้งเตือนใน Top Navigation Bar)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
