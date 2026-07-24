"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ThaiDateField } from "@/components/form/ThaiDateField";

const VISIT_TYPE_OPTIONS = ["ร่วมประชุม", "ติดตามหนี้สิน", "ตรวจเยี่ยมครัวเรือน", "ให้คำแนะนำ", "อื่นๆ"];

export function NewVisitLogModal({ villages }: { villages: { id: number; villageName: string; villageNo: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [villageId, setVillageId] = useState(villages[0]?.id ?? "");
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [visitType, setVisitType] = useState(VISIT_TYPE_OPTIONS[0]);
  const [notes, setNotes] = useState("");
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setVillageId(villages[0]?.id ?? "");
    setVisitDate(new Date().toISOString().slice(0, 10));
    setVisitType(VISIT_TYPE_OPTIONS[0]);
    setNotes("");
    setAttachmentUrls([]);
    setError(null);
  }

  async function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    const uploadedUrls: string[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.formErrors?.[0] ?? `อัปโหลดไฟล์ "${file.name}" ไม่สำเร็จ`);
        continue;
      }
      const { url } = await res.json();
      uploadedUrls.push(url);
    }
    setUploading(false);
    setAttachmentUrls((prev) => [...prev, ...uploadedUrls]);
  }

  function removeAttachment(url: string) {
    setAttachmentUrls((prev) => prev.filter((u) => u !== url));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!villageId) {
      setError("กรุณาเลือกหมู่บ้าน");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/visit-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        villageId: Number(villageId),
        visitDate,
        visitType,
        notes: notes || undefined,
        attachmentUrls,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? "บันทึกไม่สำเร็จ");
      return;
    }
    setOpen(false);
    resetForm();
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center rounded-full bg-emerald-600 px-3.5 text-sm font-semibold text-white"
      >
        + บันทึกการติดตามใหม่
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">บันทึกการติดตามและข้อแนะนำ</h2>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">หมู่บ้าน</label>
            <select
              value={villageId}
              onChange={(e) => setVillageId(Number(e.target.value))}
              required
              className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
            >
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  หมู่ {v.villageNo} บ้าน{v.villageName}
                </option>
              ))}
            </select>
          </div>

          <ThaiDateField
            label="วันที่ลงพื้นที่"
            required
            value={visitDate}
            onChange={(isoDate) => setVisitDate(isoDate ?? "")}
          />

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">ประเภทการลงพื้นที่</label>
            <select
              value={visitType}
              onChange={(e) => setVisitType(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
            >
              {VISIT_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">ข้อแนะนำ/รายละเอียด</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="เช่น แนะนำให้ครัวเรือนวางแผนชำระหนี้เป็นงวดย่อย"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">เอกสาร/ภาพถ่ายแนบ (ไม่บังคับ)</label>
            <div className="flex flex-col gap-2">
              {attachmentUrls.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {attachmentUrls.map((url) => (
                    <li key={url} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="truncate text-xs font-semibold text-emerald-700 underline">
                        ดูไฟล์ที่แนบแล้ว
                      </a>
                      <button
                        type="button"
                        onClick={() => removeAttachment(url)}
                        className="shrink-0 text-xs font-semibold text-rose-600"
                      >
                        ลบ
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="inline-flex min-h-9 w-fit items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                {uploading ? "กำลังอัปโหลด..." : "+ เลือกไฟล์ (เลือกได้หลายไฟล์)"}
              </button>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFilesChange}
              />
            </div>
          </div>

          {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={submitting || uploading}
              className="min-h-11 flex-1 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
              className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-600"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
