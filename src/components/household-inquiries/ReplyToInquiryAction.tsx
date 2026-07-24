"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { successAlert } from "@/lib/confirmDialog";

const STATUS_OPTIONS = [
  { value: "IN_PROGRESS", label: "กำลังแก้ไข" },
  { value: "RESOLVED", label: "เรียบร้อยแล้ว" },
  { value: "OTHER", label: "อื่นๆ" },
] as const;

export function ReplyToInquiryAction({
  inquiryId,
  currentStatus,
  currentStatusOther,
  currentReply,
}: {
  inquiryId: number;
  currentStatus: "IN_PROGRESS" | "RESOLVED" | "OTHER" | null;
  currentStatusOther: string | null;
  currentReply: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]["value"]>(currentStatus ?? "IN_PROGRESS");
  const [statusOther, setStatusOther] = useState(currentStatusOther ?? "");
  const [reply, setReply] = useState(currentReply ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/household-inquiries/${inquiryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        statusOther: status === "OTHER" ? statusOther : undefined,
        reply: reply || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? "บันทึกไม่สำเร็จ");
      return;
    }
    setOpen(false);
    await successAlert("บันทึกการตอบกลับเรียบร้อยแล้ว ✓ ครัวเรือนจะได้รับแจ้งเตือนทันที");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 items-center rounded-full border border-emerald-300 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
      >
        {currentReply || currentStatus ? "แก้ไขการตอบกลับ" : "+ ตอบกลับ"}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
      <div>
        <p className="mb-1 text-xs font-semibold text-slate-500">สถานะการดำเนินการ</p>
        <div className="flex flex-wrap gap-3">
          {STATUS_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
              <input type="radio" checked={status === opt.value} onChange={() => setStatus(opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>
        {status === "OTHER" && (
          <input
            type="text"
            placeholder="ระบุสถานะ"
            value={statusOther}
            onChange={(e) => setStatusOther(e.target.value)}
            required
            className="mt-2 min-h-9 w-full rounded-lg border border-slate-300 px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        )}
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold text-slate-500">ข้อความตอบกลับ (ถ้ามี — ครัวเรือนจะเห็นข้อความนี้)</p>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={3}
          placeholder="ตอบกลับถึงครัวเรือน..."
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
      </div>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="min-h-9 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "กำลังบันทึก..." : "บันทึกการตอบกลับ"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-9 rounded-lg px-3 text-xs text-slate-500">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
