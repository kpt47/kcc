import { PageContainer, SectionCard } from "@/components/layout/PageContainer";
import { DataListView, type DataListColumnDef, type DataListRow } from "@/components/shared/DataListView";
import { NewVisitLogModal } from "@/components/visit-logs/NewVisitLogModal";
import { AdviceAction } from "@/components/visit-logs/AdviceAction";
import { DeleteVisitLogButton } from "@/components/visit-logs/DeleteVisitLogButton";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getAllowedVillageIds, scopeWhereDirect } from "@/lib/scope";
import { canAdviseVisitLog, canCreateVisitLog, canViewVillageStatusBook, VISIT_LOG_DENIED_MESSAGE } from "@/lib/authz";
import { formatThaiDate } from "@/lib/thai";

export const dynamic = "force-dynamic";

// บันทึกการติดตาม/ให้ข้อแนะนำของพัฒนากรตำบล (เล่มม่วง ท้ายเล่ม) — ใช้สิทธิ์การดูชุดเดียวกับสมุดบันทึกสถานะหมู่บ้าน
// (canViewVillageStatusBook) แก้ไข/ลบได้เฉพาะพัฒนากรตำบลเจ้าของบันทึกเท่านั้น (canCreateVisitLog + ตรวจ recordedById)
// พัฒนาการอำเภอ/พัฒนาการจังหวัดพิมพ์ "คำแนะนำ" ต่อท้ายได้ (canAdviseVisitLog) — ทุกฝ่ายที่มีสิทธิ์ดู
// ค้นหา/จัดเรียง/สลับมุมมองตาราง-กล่อง/ส่งออก PDF-Excel-PNG ได้ตามข้อมูลที่กรองสิทธิ์มาแล้ว (ดู DataListView)
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
  const canCreate = canCreateVisitLog(user);
  const canAdvise = canAdviseVisitLog(user);
  const showVillageColumn = scope === "all" || scope.length > 1;

  const [records, villages] = await Promise.all([
    prisma.visitLog.findMany({
      where: scopeWhereDirect(scope),
      orderBy: { visitDate: "desc" },
      include: {
        village: { select: { villageName: true, villageNo: true } },
        attachments: { select: { id: true, fileUrl: true } },
        advisedBy: { select: { username: true } },
      },
    }),
    prisma.village.findMany({
      where: scopeWhereDirect(scope, "id"),
      select: { id: true, villageName: true, villageNo: true },
      orderBy: { villageName: "asc" },
    }),
  ]);

  const columns: DataListColumnDef[] = [
    { key: "visitDate", label: "วันที่ลงพื้นที่" },
    ...(showVillageColumn ? [{ key: "village", label: "หมู่บ้าน" } as DataListColumnDef] : []),
    { key: "visitType", label: "ประเภท" },
    { key: "visitor", label: "ผู้บันทึก" },
    { key: "notes", label: "รายละเอียด" },
    { key: "advice", label: "คำแนะนำ" },
    { key: "attachments", label: "ไฟล์แนบ", align: "center" },
    { key: "actions", label: "จัดการ" },
  ];

  const rows: DataListRow[] = records.map((r) => {
    const canEdit = canCreate && r.recordedById === user.id;
    const area = `หมู่ ${r.village.villageNo} บ้าน${r.village.villageName}`;
    const visitDateLabel = formatThaiDate(r.visitDate);
    const visitorLabel = `${r.visitorName}${r.visitorTitle ? ` (${r.visitorTitle})` : ""}`;

    const editActions = canEdit ? (
      <div className="flex flex-wrap gap-2">
        <NewVisitLogModal
          villages={villages}
          existing={{
            id: r.id,
            villageId: r.villageId,
            visitDate: r.visitDate.toISOString(),
            visitType: r.visitType,
            notes: r.notes,
            attachmentUrls: r.attachments.map((a) => a.fileUrl),
          }}
        />
        <DeleteVisitLogButton id={r.id} />
      </div>
    ) : null;

    const adviceContent = (
      <div className="flex flex-col gap-1.5">
        {r.advice && <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">{r.advice}</p>}
        {canAdvise && <AdviceAction visitLogId={r.id} currentAdvice={r.advice} />}
        {!canAdvise && !r.advice && <span className="text-xs text-slate-400">-</span>}
      </div>
    );

    const attachmentsContent =
      r.attachments.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-1.5">
          {r.attachments.map((a) => (
            <a
              key={a.id}
              href={a.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-emerald-700 underline dark:text-emerald-400"
            >
              ไฟล์
            </a>
          ))}
        </div>
      ) : (
        <span className="text-xs text-slate-400">-</span>
      );

    return {
      key: r.id,
      searchText: [area, r.visitType, r.visitorName, r.notes, r.advice].filter(Boolean).join(" ").toLowerCase(),
      // ค่าลบของ timestamp — ให้ค่าเริ่มต้นเรียงบันทึกล่าสุดขึ้นก่อน (ตรงกับพฤติกรรมเดิมของหน้านี้)
      sortValues: { visitDate: -r.visitDate.getTime(), village: area, visitType: r.visitType, visitor: r.visitorName },
      cells: {
        visitDate: visitDateLabel,
        village: area,
        visitType: (
          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800 dark:bg-violet-900/60 dark:text-violet-300">
            {r.visitType}
          </span>
        ),
        visitor: visitorLabel,
        notes: <span className="line-clamp-2 max-w-xs whitespace-normal">{r.notes}</span>,
        advice: adviceContent,
        attachments: attachmentsContent,
        actions: editActions,
      },
      excelRow: {
        วันที่ลงพื้นที่: visitDateLabel,
        หมู่บ้าน: area,
        ประเภท: r.visitType,
        ผู้บันทึก: visitorLabel,
        รายละเอียด: r.notes ?? "",
        คำแนะนำ: r.advice ?? "",
      },
      card: (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="w-fit rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800 dark:bg-violet-900/60 dark:text-violet-300">
                {r.visitType}
              </span>
              <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {visitDateLabel}
                {showVillageColumn && <span className="font-normal text-slate-500 dark:text-slate-400"> · {area}</span>}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">ผู้บันทึก: {visitorLabel}</p>
            </div>
            {editActions}
          </div>

          {r.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{r.notes}</p>}

          {r.attachments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {r.attachments.map((a) => (
                <a
                  key={a.id}
                  href={a.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 items-center rounded-full border border-emerald-300 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
                >
                  ดูไฟล์แนบ
                </a>
              ))}
            </div>
          )}

          <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">{adviceContent}</div>
        </div>
      ),
    };
  });

  return (
    <PageContainer title="บันทึกการติดตามและข้อแนะนำ" subtitle="ประวัติการลงพื้นที่ปฏิบัติงานของพัฒนากรตำบล (เล่มม่วง ท้ายเล่ม)">
      {canCreate && (
        <div className="flex justify-end">
          <NewVisitLogModal villages={villages} />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          ยังไม่มีบันทึกการติดตามในระบบ
        </p>
      ) : (
        <DataListView
          rows={rows}
          columns={columns}
          defaultSortField="visitDate"
          searchPlaceholder="ค้นหาหมู่บ้าน, ประเภท, ผู้บันทึก, รายละเอียด, คำแนะนำ..."
          emptyMessage="ไม่พบบันทึกที่ตรงกับการค้นหานี้"
          exportFilename="visit-logs"
        />
      )}
    </PageContainer>
  );
}
