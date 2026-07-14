import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resetPasswordWithOtpSchema } from "@/lib/schemas";
import { hashPassword } from "@/lib/auth";
import { verifyOtp } from "@/lib/otp";
import { logAuditEvent } from "@/lib/auditLog";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = resetPasswordWithOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { username, otp, newPassword } = parsed.data;

  const invalidOtp = async (userId?: number) => {
    await logAuditEvent({
      userId: userId ?? null,
      username,
      action: "PASSWORD_RESET_FAILED",
      detail: "รหัส OTP ไม่ถูกต้องหรือหมดอายุ",
      request,
    });
    return NextResponse.json({ error: { formErrors: ["รหัส OTP ไม่ถูกต้องหรือหมดอายุ กรุณาขอรหัสใหม่อีกครั้ง"] } }, { status: 400 });
  };

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return invalidOtp();

  const candidateOtps = await prisma.passwordResetOtp.findMany({
    where: { userId: user.id, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  let matchedOtpId: number | null = null;
  for (const candidate of candidateOtps) {
    if (await verifyOtp(otp, candidate.otpHash)) {
      matchedOtpId = candidate.id;
      break;
    }
  }
  if (!matchedOtpId) return invalidOtp(user.id);

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.passwordResetOtp.update({ where: { id: matchedOtpId }, data: { consumedAt: new Date() } }),
  ]);

  await logAuditEvent({ userId: user.id, username: user.username, action: "PASSWORD_RESET_SUCCESS", request });

  return NextResponse.json({ ok: true });
}
