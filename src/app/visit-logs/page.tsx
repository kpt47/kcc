import { PageContainer, SectionCard } from "@/components/layout/PageContainer";
import { VisitLogList } from "@/components/visit-logs/VisitLogList";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getAllowedVillageIds, scopeWhereDirect } from "@/lib/scope";
import { canCreateVisitLog, canViewVillageStatusBook, VISIT_LOG_DENIED_MESSAGE } from "@/lib/authz";

export const dynamic = "force-dynamic";

// บันทึกการติดตาม/ให้ข้อแนะนำของพัฒนากรตำบล (เล่มม่วง ท้ายเล่ม) — ใช้สิทธิ์การดูชุดเดียวกับสมุดบันทึกสถานะหมู่บ้าน
// (canViewVillageStatusBook) แต่สร้าง/ลบได้เฉพาะพัฒนากรตำบลเจ้าของบันทึกเท่านั้น (canCreateVisitLog)
export default async function VisitLogsPage() {
  const user = await requireUser();

  if (!canViewVillageStatusBook(user)) {
    return (
      <PageContainer title="บันทึกการติดตามและข้อแนะนำ" subtitle="ประวัติการลงพื้นที่ปฏิบัติงานของพัฒนากรตำบล">
        <SectionCard title="ไม่มีสิทธิ์เข้าถึง">
          <p className="text-sm text-slate-600">{VISIT_LOG_DENIED_MESSAGE}</p>
        </SectionCard>
      </PageContainer>
    );
  }

  const scope = await getAllowedVillageIds(user);
  const [records, villages] = await Promise.all([
    prisma.visitLog.findMany({
      where: scopeWhereDirect(scope),
      orderBy: { visitDate: "desc" },
      include: {
        village: { select: { villageName: true, villageNo: true } },
        attachments: { select: { id: true, fileUrl: true } },
      },
    }),
    prisma.village.findMany({
      where: scopeWhereDirect(scope, "id"),
      select: { id: true, villageName: true, villageNo: true },
      orderBy: { villageName: "asc" },
    }),
  ]);

  const rows = records.map((r) => ({
    id: r.id,
    villageName: r.village.villageName,
    villageNo: r.village.villageNo,
    visitDate: r.visitDate.toISOString(),
    visitType: r.visitType,
    visitorName: r.visitorName,
    visitorTitle: r.visitorTitle,
    notes: r.notes,
    canDelete: canCreateVisitLog(user) && r.recordedById === user.id,
    attachments: r.attachments,
  }));

  return (
    <PageContainer title="บันทึกการติดตามและข้อแนะนำ" subtitle="ประวัติการลงพื้นที่ปฏิบัติงานของพัฒนากรตำบล (เล่มม่วง ท้ายเล่ม)">
      <VisitLogList
        rows={rows}
        villages={villages}
        canCreate={canCreateVisitLog(user)}
        showVillageColumn={scope === "all" || scope.length > 1}
      />
    </PageContainer>
  );
}
