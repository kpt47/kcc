import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/schemas";

// เปลี่ยนรหัสผ่านของผู้ใช้งานปัจจุบันเท่านั้น — ดึง userId จาก session ไม่รับจาก payload
// เพื่อป้องกันไม่ให้ผู้ใช้เปลี่ยนรหัสผ่านบัญชีอื่นได้
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return NextResponse.json({ error: { formErrors: ["ไม่พบผู้ใช้งาน"] } }, { status: 404 });

  const isOldPasswordCorrect = await verifyPassword(parsed.data.oldPassword, dbUser.passwordHash);
  if (!isOldPasswordCorrect) {
    return NextResponse.json(
      { error: { fieldErrors: { oldPassword: ["รหัสผ่านเดิมไม่ถูกต้อง"] } } },
      { status: 400 }
    );
  }

  const newPasswordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newPasswordHash },
  });

  return NextResponse.json({ ok: true });
}
