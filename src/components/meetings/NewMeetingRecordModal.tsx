"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function NewMeetingRecordModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [agendaTopic, setAgendaTopic] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setMeetingDate(new Date().toISOString().slice(0, 10));
    setAgendaTopic("");
    setFileUrl(null);
    setError(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: formData });
    setUploading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? "อัปโหลดไฟล์ไม่สำเร็จ");
      return;
    }
    const { url } = await res.json();
    setFileUrl(url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fileUrl) {
      setError("กรุณาแนบไฟล์วาระการประชุม (.pdf, .jpg, .png)");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingDate, agendaTopic, fileUrl }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(
        body?.error?.formErrors?.[0] ??
          body?.error?.fieldErrors?.agendaTopic?.[0] ??
          body?.error?.fieldErrors?.meetingDate?.[0] ??
          body?.error?.fieldErrors?.fileUrl?.[0] ??
          "บันทึกไม่สำเร็จ"
      );
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
        + อัปโหลดวาระการประชุม
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">อัปโหลดวาระการประชุม</h2>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">วันที่ประชุม</label>
            <input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              required
              className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
            />
          </div>
          <input
            type="text"
            placeholder="หัวข้อวาระการประชุม"
            value={agendaTopic}
            onChange={(e) => setAgendaTopic(e.target.value)}
            required
            className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
          />

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">ไฟล์แนบ (.pdf, .jpg, .png)</label>
            <div className="flex flex-wrap items-center gap-2">
              {fileUrl ? (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-emerald-700 underline">
                  ดูไฟล์ที่แนบแล้ว
                </a>
              ) : (
                <span className="text-xs text-slate-400">ยังไม่ได้แนบไฟล์</span>
              )}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                {uploading ? "กำลังอัปโหลด..." : fileUrl ? "เปลี่ยนไฟล์" : "เลือกไฟล์"}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                className="hidden"
                onChange={handleFileChange}
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
