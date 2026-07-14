import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// ทำเครื่องหมายว่าอ่านแล้วสำหรับการแจ้งเตือนทั้งหมดของผู้ใช้ปัจจุบัน
export async function PATCH() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const result = await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });
  return NextResponse.json({ updatedCount: result.count });
}
