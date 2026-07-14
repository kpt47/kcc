import { prisma } from "@/lib/prisma";

// บันทึกประวัติการขอ OTP หรือ Login ที่ผิดปกติลง SystemAuditLog เสมอ — เรียกใช้แบบ best-effort
// (ไม่ให้ error จากการบันทึก log มาขัดขวาง flow หลักของ login/reset-password)
function extractIp(request?: Request): string | null {
  if (!request) return null;
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}

export async function logAuditEvent(params: {
  userId?: number | null;
  username?: string | null;
  action: string;
  detail?: string;
  request?: Request;
}) {
  try {
    await prisma.systemAuditLog.create({
      data: {
        userId: params.userId ?? undefined,
        username: params.username ?? undefined,
        action: params.action,
        detail: params.detail,
        ipAddress: extractIp(params.request),
      },
    });
  } catch (err) {
    console.error("[auditLog] บันทึก SystemAuditLog ล้มเหลว", err);
  }
}
