import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasMinRole } from "@/lib/authz";
import { runDailyRepaymentCheck } from "@/lib/notifications/repayment-check";

// Endpoint สำหรับทดสอบงานตรวจสอบการชำระเงินยืมประจำวันด้วยตนเอง (ไม่ต้องรอ cron รันตอน 08:00 น.)
// จำกัดสิทธิ์เฉพาะ GLOBAL_ADMIN เนื่องจากงานนี้ query/สร้าง Notification ข้ามทุกหมู่บ้านในระบบ
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });
  if (!hasMinRole(user, "GLOBAL_ADMIN")) {
    return NextResponse.json({ error: { formErrors: ["เฉพาะผู้ดูแลระบบส่วนกลางเท่านั้น"] } }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const now = typeof body?.now === "string" ? new Date(body.now) : undefined;
  if (now !== undefined && Number.isNaN(now.getTime())) {
    return NextResponse.json({ error: { formErrors: ["รูปแบบวันที่ now ไม่ถูกต้อง"] } }, { status: 400 });
  }

  const summary = await runDailyRepaymentCheck(now);
  return NextResponse.json(summary);
}
