"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, XCircle, Clock3 } from "lucide-react";
import { formatThaiDate } from "@/lib/thai";
import { ThaiDateField } from "@/components/form/ThaiDateField";

export type HouseholdConfirmationStatus = {
  householdId: number;
  name: string;
  status: "confirmed" | "disputed" | "pending";
  confirmedAt: string | null;
  note: string | null;
};

// ให้ประธานคณะกรรมการ (CHAIRMAN) กำหนดวันเริ่มยืนยันยอดหนี้ประจำปีของหมู่บ้านตนเอง (POST /api/debt-confirmation/round)
// และดูสถานะการยืนยันของแต่ละครัวเรือนในรอบล่าสุด — ดู src/lib/authz.ts: canSetDebtConfirmationDate
export function DebtConfirmationAdminCard({
  currentYear,
  currentDate,
  households,
}: {
  currentYear: number;
  currentDate: string | null;
  households: HouseholdConfirmationStatus[];
}) {
  const router = useRouter();
  const [year, setYear] = useState(currentYear);
  const [date, setDate] = useState(currentDate ?? new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    const res = await fetch("/api/debt-confirmation/round", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, confirmationDate: date }),
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

  const confirmedCount = households.filter((h) => h.status !== "pending").length;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
        <p className="text-base font-bold text-slate-900 dark:text-slate-100">ยืนยันยอดหนี้ประจำปี</p>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        กำหนดวันเริ่มให้ครัวเรือนยืนยันยอดหนี้คงเหลือของตนเอง — ยืนยันได้ตั้งแต่วันที่กำหนดเป็นต้นไป
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">ปี พ.ศ.</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="min-h-11 w-28 rounded-lg border border-slate-300 px-3 text-base"
          />
        </div>
        <ThaiDateField
          label="วันที่เริ่มยืนยันยอด"
          value={date}
          onChange={(isoDate) => setDate(isoDate ?? "")}
        />
        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </form>
      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
      {success && <p className="text-sm font-medium text-emerald-600">บันทึกข้อมูลสำเร็จแล้ว</p>}

      {households.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            สถานะการยืนยัน ปี {currentYear}: {confirmedCount}/{households.length} ครัวเรือน
          </p>
          <div className="flex flex-col gap-2">
            {households.map((h) => (
              <div
                key={h.householdId}
                className="flex flex-col gap-1 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{h.name}</p>
                  {h.status === "confirmed" && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      ยืนยันแล้ว - ตรง
                    </span>
                  )}
                  {h.status === "disputed" && (
                    <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                      <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      แจ้งปัญหา
                    </span>
                  )}
                  {h.status === "pending" && (
                    <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      ยังไม่ยืนยัน
                    </span>
                  )}
                </div>
                {h.confirmedAt && (
                  <p className="text-xs text-slate-400">ยืนยันเมื่อ {formatThaiDate(h.confirmedAt)}</p>
                )}
                {h.note && <p className="text-xs text-rose-600">หมายเหตุ: {h.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
