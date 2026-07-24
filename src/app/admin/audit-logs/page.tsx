import Link from "next/link";
import { PageContainer, SectionCard } from "@/components/layout/PageContainer";
import { prisma } from "@/lib/prisma";
import { formatThaiDateTime } from "@/lib/formatDate";
import { requireUser } from "@/lib/auth";
import { canViewAuditLog, auditLogSeesAllAreas, auditLogRowCap } from "@/lib/authz";
import { getAllowedVillageIds } from "@/lib/scope";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 200;

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
// ส่วนกลาง/IT_SUPPORT เห็นได้ทั้งหมดไม่เกิน 250,000 รายการ — พัฒนาการจังหวัด/อำเภอ/พัฒนากรตำบล เห็นเฉพาะ
// เหตุการณ์ในพื้นที่ที่ตนรับผิดชอบ (กรองด้วย villageId) ไม่เกิน 25,000 รายการ — แบ่งหน้าละ 200 รายการทั้งคู่
// ข้อมูลมีอายุ 18 เดือน แล้วลบทิ้งอัตโนมัติทุกวัน (ดู deleteExpiredAuditLogs ใน lib/auditLog.ts)
export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireUser();

  if (!canViewAuditLog(user)) {
    return (
      <PageContainer title="Audit Logs" subtitle="ประวัติการเข้าสู่ระบบและการขอ OTP ที่ผิดปกติ">
        <SectionCard title="ไม่มีสิทธิ์เข้าถึง">
          <p className="text-sm text-slate-600">
            Access Denied: หน้านี้สงวนไว้สำหรับผู้บริหารส่วนกลาง/จังหวัด/อำเภอ พัฒนากรตำบล และผู้ดูแลระบบ (IT_SUPPORT) เท่านั้น
          </p>
        </SectionCard>
      </PageContainer>
    );
  }

  const seesAll = auditLogSeesAllAreas(user);
  const cap = auditLogRowCap(user);
  const scope = seesAll ? "all" : await getAllowedVillageIds(user);
  const whereClause = scope === "all" ? {} : { villageId: { in: scope } };

  const totalCount = await prisma.systemAuditLog.count({ where: whereClause });
  const effectiveTotal = Math.min(totalCount, cap);
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / PAGE_SIZE));

  const { page: pageParam } = await searchParams;
  const requestedPage = Math.max(1, Number(pageParam) || 1);
  const page = Math.min(requestedPage, totalPages);
  const skip = (page - 1) * PAGE_SIZE;

  const logs = await prisma.systemAuditLog.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    skip,
    take: PAGE_SIZE,
    include: { village: { select: { villageName: true, villageNo: true } } },
  });

  const scopeLabel = seesAll ? "ทุกพื้นที่ทั่วประเทศ" : "เฉพาะพื้นที่ในความรับผิดชอบของท่าน";

  return (
    <PageContainer
      title="Audit Logs"
      subtitle={`ประวัติการเข้าสู่ระบบและการขอ OTP — ${scopeLabel} · ทั้งหมด ${totalCount.toLocaleString("th-TH")} รายการ (แสดงได้สูงสุด ${cap.toLocaleString("th-TH")} รายการ, เก็บย้อนหลัง 18 เดือน) · หน้า ${page}/${totalPages}`}
    >
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
                {seesAll && log.village && (
                  <span className="text-slate-500">
                    พื้นที่: หมู่ {log.village.villageNo} บ้าน{log.village.villageName}
                  </span>
                )}
              </div>
              {log.detail && <p className="mt-1 text-sm text-slate-600">{log.detail}</p>}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href={`/admin/audit-logs?page=${Math.max(1, page - 1)}`}
            aria-disabled={page <= 1}
            className={`inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold ${
              page <= 1 ? "pointer-events-none opacity-40" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            ก่อนหน้า
          </Link>
          <span className="text-sm text-slate-500">
            หน้า {page} จาก {totalPages}
          </span>
          <Link
            href={`/admin/audit-logs?page=${Math.min(totalPages, page + 1)}`}
            aria-disabled={page >= totalPages}
            className={`inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold ${
              page >= totalPages ? "pointer-events-none opacity-40" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            ถัดไป
          </Link>
        </div>
      )}
    </PageContainer>
  );
}
