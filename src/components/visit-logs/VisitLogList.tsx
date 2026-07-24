"use client";

import { useRouter } from "next/navigation";
import { formatThaiDate } from "@/lib/thai";
import { confirmDialog } from "@/lib/confirmDialog";
import { NewVisitLogModal } from "./NewVisitLogModal";

export type VisitLogRow = {
  id: number;
  villageName: string;
  villageNo: string;
  visitDate: string;
  visitType: string;
  visitorName: string;
  visitorTitle: string | null;
  notes: string | null;
  canDelete: boolean;
  attachments: { id: number; fileUrl: string }[];
};

export function VisitLogList({
  rows,
  villages,
  canCreate,
  showVillageColumn,
}: {
  rows: VisitLogRow[];
  villages: { id: number; villageName: string; villageNo: string }[];
  canCreate: boolean;
  showVillageColumn: boolean;
}) {
  const router = useRouter();

  async function handleDelete(id: number) {
    const confirmed = await confirmDialog({
      title: "ลบบันทึกการติดตาม?",
      text: "คุณแน่ใจหรือไม่ที่จะลบบันทึกนี้? การลบไม่สามารถกู้คืนได้",
      tone: "danger",
      confirmButtonText: "ลบบันทึก",
    });
    if (!confirmed) return;
    const res = await fetch(`/api/visit-logs/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
      return;
    }
    const body = await res.json().catch(() => null);
    await confirmDialog({
      title: "ลบไม่สำเร็จ",
      text: body?.error?.formErrors?.[0] ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
      tone: "danger",
      confirmButtonText: "ตกลง",
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {canCreate && (
        <div className="flex justify-end">
          <NewVisitLogModal villages={villages} />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          ยังไม่มีบันทึกการติดตามในระบบ
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="w-fit rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800">
                    {r.visitType}
                  </span>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {formatThaiDate(r.visitDate)}
                    {showVillageColumn && (
                      <span className="font-normal text-slate-500">
                        {" "}
                        · หมู่ {r.villageNo} บ้าน{r.villageName}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    ผู้บันทึก: {r.visitorName}
                    {r.visitorTitle ? ` (${r.visitorTitle})` : ""}
                  </p>
                </div>
                {r.canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    className="shrink-0 rounded-full border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    ลบ
                  </button>
                )}
              </div>

              {r.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{r.notes}</p>}

              {r.attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.attachments.map((a) => (
                    <a
                      key={a.id}
                      href={a.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-9 items-center rounded-full border border-emerald-300 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      ดูไฟล์แนบ
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
