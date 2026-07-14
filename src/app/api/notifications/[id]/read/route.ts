import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// ทำเครื่องหมายว่าอ่านแล้วสำหรับการแจ้งเตือนรายการเดียว (เฉพาะเจ้าของแจ้งเตือนเท่านั้น)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const { id } = await params;
  const notificationId = Number(id);

  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.userId !== user.id) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบการแจ้งเตือนที่ระบุ"] } }, { status: 404 });
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
  return NextResponse.json(updated);
}
