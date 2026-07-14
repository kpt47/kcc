import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resetPasswordAdminSchema } from "@/lib/schemas";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { canManageTargetRole, getManagedUserWhere } from "@/lib/userManagement";

// รีเซ็ตรหัสผ่านของผู้ใช้ที่อยู่ในความดูแล — เฉพาะ role ที่ต่ำกว่าตนเอง 1 ระดับ และอยู่ในเขตอำนาจของตนเองเท่านั้น
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const { id } = await params;
  const targetId = Number(id);

  if (targetId === user.id) {
    return NextResponse.json(
      { error: { formErrors: ["ไม่สามารถรีเซ็ตรหัสผ่านของตนเองผ่านหน้านี้ได้ กรุณาใช้หน้าโปรไฟล์"] } },
      { status: 403 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบผู้ใช้งานที่ระบุ"] } }, { status: 404 });
  }

  const inScope = await prisma.user.findFirst({ where: { id: targetId, ...getManagedUserWhere(user) } });
  if (!inScope || !canManageTargetRole(user, target.role)) {
    return NextResponse.json({ error: { formErrors: ["คุณไม่มีสิทธิ์จัดการบัญชีผู้ใช้งานนี้"] } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = resetPasswordAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: targetId }, data: { passwordHash } });

  // ตัดเซสชันเดิมของผู้ใช้ที่ถูกรีเซ็ตรหัสผ่านทั้งหมด บังคับให้เข้าสู่ระบบใหม่ด้วยรหัสผ่านใหม่
  await prisma.session.deleteMany({ where: { userId: targetId } });

  return NextResponse.json({ ok: true });
}
