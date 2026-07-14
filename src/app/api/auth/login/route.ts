import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/schemas";
import { createSession, verifyPassword } from "@/lib/auth";
import { verifyTurnstileToken } from "@/lib/captcha";
import { logAuditEvent } from "@/lib/auditLog";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { formErrors: ["กรุณากรอกชื่อผู้ใช้และรหัสผ่าน"] } }, { status: 400 });
  }

  // ตรวจสอบ CAPTCHA (Cloudflare Turnstile) ก่อนตรวจสอบ Username/Password เสมอ — ป้องกันการโจมตีแบบ Brute-force
  const captchaValid = await verifyTurnstileToken(body.captchaToken ?? null);
  if (!captchaValid) {
    await logAuditEvent({
      username: parsed.data.username,
      action: "LOGIN_FAILED_CAPTCHA",
      detail: "ตรวจสอบ CAPTCHA ไม่ผ่าน",
      request,
    });
    return NextResponse.json({ error: { formErrors: ["ตรวจสอบ CAPTCHA ไม่ผ่าน กรุณาลองใหม่อีกครั้ง"] } }, { status: 400 });
  }

  const invalidCredentials = async () => {
    await logAuditEvent({
      username: parsed.data.username,
      action: "LOGIN_FAILED_CREDENTIALS",
      detail: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
      request,
    });
    return NextResponse.json({ error: { formErrors: ["ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"] } }, { status: 401 });
  };

  const user = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (!user) return invalidCredentials();

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return invalidCredentials();

  if (!user.isActive) {
    await logAuditEvent({
      userId: user.id,
      username: user.username,
      action: "LOGIN_FAILED_INACTIVE",
      detail: "บัญชีถูกระงับการใช้งาน",
      request,
    });
    return NextResponse.json({ error: { formErrors: ["บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ"] } }, { status: 403 });
  }

  await createSession(user.id);
  await logAuditEvent({ userId: user.id, username: user.username, action: "LOGIN_SUCCESS", request });
  return NextResponse.json({ ok: true });
}
