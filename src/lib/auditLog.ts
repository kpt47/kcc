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
    // เติม villageId อัตโนมัติจาก scopeVillageId ของผู้ก่อเหตุการณ์ (มีผลเฉพาะ VILLAGE_COMMITTEE/HOUSEHOLD
    // ซึ่งผูกกับหมู่บ้านเดียว) — ใช้เป็นขอบเขตกรองดูเฉพาะพื้นที่สำหรับพัฒนากรตำบล/ผู้บริหารอำเภอ/จังหวัด
    // role อื่น (พัฒนากรขึ้นไป/IT_SUPPORT) ไม่ผูกกับหมู่บ้านเดียว จึง villageId เป็น null เสมอ
    let villageId: number | null = null;
    if (params.userId) {
      const actor = await prisma.user.findUnique({ where: { id: params.userId }, select: { scopeVillageId: true } });
      villageId = actor?.scopeVillageId ?? null;
    }

    await prisma.systemAuditLog.create({
      data: {
        userId: params.userId ?? undefined,
        username: params.username ?? undefined,
        action: params.action,
        detail: params.detail,
        ipAddress: extractIp(params.request),
        villageId: villageId ?? undefined,
      },
    });
  } catch (err) {
    console.error("[auditLog] บันทึก SystemAuditLog ล้มเหลว", err);
  }
}

const AUDIT_LOG_RETENTION_MONTHS = 18;

/** ลบ SystemAuditLog ที่เก่าเกิน 18 เดือน — เรียกจาก cron รายวัน (ดู lib/notifications/repayment-check.ts) */
export async function deleteExpiredAuditLogs(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - AUDIT_LOG_RETENTION_MONTHS);
  const { count } = await prisma.systemAuditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return count;
}
