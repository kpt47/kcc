"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { REMINDER_LEAD_DAY_OPTIONS, REMINDER_LEAD_DAY_LABELS } from "@/lib/reminderSettings";

// ให้ครัวเรือนเลือกจำนวนวันล่วงหน้าที่ต้องการรับแจ้งเตือนก่อนครบกำหนดชำระเงินยืม (แทนค่าคงที่เดิมที่ตายตัว)
// ดู src/lib/notifications/repayment-check.ts ซึ่งอ่านค่านี้ต่อผู้ใช้แต่ละคนตอนรันงานประจำวัน
export function ReminderSettingsForm({ reminderLeadDays }: { reminderLeadDays: number }) {
  const router = useRouter();
  const [value, setValue] = useState(reminderLeadDays);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminderLeadDays: value }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? "บันทึกไม่สำเร็จ");
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">แจ้งเตือนล่วงหน้าก่อนครบกำหนดชำระ</label>
        <select
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base"
        >
          {REMINDER_LEAD_DAY_OPTIONS.map((days) => (
            <option key={days} value={days}>
              {REMINDER_LEAD_DAY_LABELS[days]}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
      {success && <p className="text-sm font-medium text-emerald-600">บันทึกข้อมูลสำเร็จแล้ว</p>}
      <button
        type="submit"
        disabled={submitting}
        className="min-h-11 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {submitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
      </button>
    </form>
  );
}
