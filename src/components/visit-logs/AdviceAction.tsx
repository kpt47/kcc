"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { successAlert } from "@/lib/confirmDialog";

// พัฒนาการอำเภอ/พัฒนาการจังหวัดพิมพ์ "คำแนะนำ" ต่อท้ายบันทึกการติดตามของพัฒนากรตำบล — เห็นได้ทุกฝ่ายที่มีสิทธิ์ดูบันทึกนี้
export function AdviceAction({ visitLogId, currentAdvice }: { visitLogId: number; currentAdvice: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [advice, setAdvice] = useState(currentAdvice ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/visit-logs/${visitLogId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ advice }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? "บันทึกไม่สำเร็จ");
      return;
    }
    setOpen(false);
    await successAlert("บันทึกคำแนะนำเรียบร้อยแล้ว ✓");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 items-center rounded-full border border-sky-300 px-3 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-400"
      >
        {currentAdvice ? "แก้ไขคำแนะนำ" : "+ ให้คำแนะนำ"}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-950/30">
      <textarea
        value={advice}
        onChange={(e) => setAdvice(e.target.value)}
        rows={3}
        required
        placeholder="พิมพ์คำแนะนำถึงพัฒนากรตำบล..."
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
      />
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="min-h-9 rounded-lg bg-sky-600 px-3 text-xs font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "กำลังบันทึก..." : "บันทึกคำแนะนำ"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-9 rounded-lg px-3 text-xs text-slate-500">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
