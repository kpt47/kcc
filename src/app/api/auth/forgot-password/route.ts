import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordRequestSchema } from "@/lib/schemas";
import { generateOtp, hashOtp } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email/sendOtpEmail";
import { logAuditEvent } from "@/lib/auditLog";

const OTP_TTL_MS = 5 * 60 * 1000; // หมดอายุใน 5 นาที

// คืนข้อความสำเร็จแบบเดียวกันเสมอ ไม่ว่า username/email จะตรงกับผู้ใช้จริงหรือไม่ — ป้องกันการสอดแนม
// รายชื่อผู้ใช้งานในระบบ (Account Enumeration) ผ่านการสังเกตความแตกต่างของ response
const GENERIC_SUCCESS_MESSAGE =
  "หากชื่อผู้ใช้และอีเมลตรงกับข้อมูลในระบบ เราได้ส่งรหัส OTP ไปยังอีเมลนั้นแล้ว กรุณาตรวจสอบกล่องจดหมาย";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = forgotPasswordRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { username, email } = parsed.data;

  const user = await prisma.user.findFirst({ where: { username, email } });

  await logAuditEvent({
    userId: user?.id ?? null,
    username,
    action: "FORGOT_PASSWORD_REQUESTED",
    detail: user ? "พบผู้ใช้งานที่ตรงกัน — ส่ง OTP" : "ไม่พบผู้ใช้งานที่ตรงกับ username+email ที่ระบุ",
    request,
  });

  if (user) {
    // ยกเลิก OTP เดิมที่ยังไม่ถูกใช้ทั้งหมดก่อนสร้างใหม่ — ป้องกันการใช้ OTP เก่าซ้ำ
    await prisma.passwordResetOtp.deleteMany({ where: { userId: user.id, consumedAt: null } });

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    await prisma.passwordResetOtp.create({
      data: { userId: user.id, otpHash, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });

    await sendOtpEmail(user.email, otp);
  }

  return NextResponse.json({ ok: true, message: GENERIC_SUCCESS_MESSAGE });
}
