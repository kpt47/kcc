import { PageContainer, SectionCard } from "@/components/layout/PageContainer";
import { prisma } from "@/lib/prisma";
import { formatThaiDateTime } from "@/lib/formatDate";
import { requireUser } from "@/lib/auth";
import { canViewAuditLog } from "@/lib/authz";

export const dynamic = "force-dynamic";

const RECENT_LIMIT = 200;

const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "เข้าสู่ระบบสำเร็จ",
  LOGIN_FAILED_CAPTCHA: "เข้าสู่ระบบล้มเหลว (CAPTCHA)",
  LOGIN_FAILED_CREDENTIALS: "เข้าสู่ระบบล้มเหลว (รหัสผ่านผิด)",
  LOGIN_FAILED_INACTIVE: "เข้าสู่ระบบล้มเหลว (บัญชีถูกระงับ)",
  FORGOT_PASSWORD_REQUESTED: "ขอรหัส OTP กู้คืนรหัสผ่าน",
  PASSWORD_RESET_SUCCESS: "ตั้งรหัสผ่านใหม่สำเร็จ",
  PASSWORD_RESET_FAILED: "ตั้งรหัสผ่านใหม่ล้มเหลว",
};

const ACTION_TONE: Record<string, string> = {
  LOGIN_SUCCESS: "bg-emerald-100 text-emerald-800",
  PASSWORD_RESET_SUCCESS: "bg-emerald-100 text-emerald-800",
  FORGOT_PASSWORD_REQUESTED: "bg-sky-100 text-sky-800",
};
const DEFAULT_TONE = "bg-rose-100 text-rose-700";

// Audit Log ของระบบ (SystemAuditLog) — บันทึกประวัติการขอ OTP และ Login ที่ผิดปกติ (ดู lib/auditLog.ts)
// เฉพาะส่วนกลาง (GLOBAL_ADMIN) และผู้ดูแลระบบ (IT_SUPPORT) เท่านั้นที่เข้าถึงหน้านี้ได้ (ดู canViewAuditLog)
export default async function AuditLogsPage() {
  const user = await requireUser();

  if (!canViewAuditLog(user)) {
    return (
      <PageContainer title="Audit Logs" subtitle="ประวัติการเข้าสู่ระบบและการขอ OTP ที่ผิดปกติ">
        <SectionCard title="ไม่มีสิทธิ์เข้าถึง">
          <p className="text-sm text-slate-600">
            Access Denied: หน้านี้สงวนไว้สำหรับผู้บริหารส่วนกลางและผู้ดูแลระบบ (IT_SUPPORT) เท่านั้น
          </p>
        </SectionCard>
      </PageContainer>
    );
  }

  const logs = await prisma.systemAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: RECENT_LIMIT,
  });

  return (
    <PageContainer title="Audit Logs" subtitle={`ประวัติการเข้าสู่ระบบและการขอ OTP ล่าสุด ${RECENT_LIMIT} รายการ`}>
      {logs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          ยังไม่มีประวัติการบันทึกในระบบ
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ACTION_TONE[log.action] ?? DEFAULT_TONE}`}>
                  {ACTION_LABELS[log.action] ?? log.action}
                </span>
                <span className="text-xs text-slate-500">
                  {formatThaiDateTime(log.createdAt)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
                <span>ผู้ใช้: {log.username ?? "-"}</span>
                {log.ipAddress && <span className="text-slate-500">IP: {log.ipAddress}</span>}
              </div>
              {log.detail && <p className="mt-1 text-sm text-slate-600">{log.detail}</p>}
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
