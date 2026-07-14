"use client";

import { useRouter } from "next/navigation";
import { formatThaiDate } from "@/lib/thai";
import { confirmDialog } from "@/lib/confirmDialog";
import { NewMeetingRecordModal } from "./NewMeetingRecordModal";

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"
      />
    </svg>
  );
}

export type MeetingRecordRow = {
  id: number;
  villageName: string;
  villageNo: string;
  meetingDate: string;
  agendaTopic: string;
  fileUrl: string;
  uploadedByName: string;
};

export function MeetingRecordsTable({
  rows,
  canUpload,
  canDelete,
  showVillageColumn,
}: {
  rows: MeetingRecordRow[];
  canUpload: boolean;
  canDelete: boolean;
  showVillageColumn: boolean;
}) {
  const router = useRouter();

  async function handleDelete(id: number, agendaTopic: string) {
    const confirmed = await confirmDialog({
      title: "ลบเอกสารวาระการประชุม?",
      text: `คุณแน่ใจหรือไม่ที่จะลบเอกสารวาระการประชุมนี้? ("${agendaTopic}")`,
      tone: "danger",
      confirmButtonText: "ลบเอกสาร",
    });
    if (!confirmed) return;
    const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" });
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
      {canUpload && (
        <div className="flex justify-end">
          <NewMeetingRecordModal />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          ยังไม่มีเอกสารวาระการประชุมในระบบ
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">วันที่ประชุม</th>
                {showVillageColumn && <th className="px-3 py-2">หมู่บ้าน</th>}
                <th className="px-3 py-2">หัวข้อวาระ</th>
                <th className="px-3 py-2">ผู้บันทึก/อัปโหลด</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">{formatThaiDate(r.meetingDate)}</td>
                  {showVillageColumn && (
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                      หมู่ {r.villageNo} บ้าน{r.villageName}
                    </td>
                  )}
                  <td className="px-3 py-2 text-slate-700">{r.agendaTopic}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.uploadedByName}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <div className="flex items-center gap-2">
                      <a
                        href={r.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-8 items-center rounded-full border border-emerald-300 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                      >
                        ดูไฟล์/ดาวน์โหลด
                      </a>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id, r.agendaTopic)}
                          aria-label="ลบเอกสาร"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-300 text-rose-700 hover:bg-rose-50"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
