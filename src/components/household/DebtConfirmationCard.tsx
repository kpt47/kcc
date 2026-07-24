"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, ClipboardCheck } from "lucide-react";

// แสดงเฉพาะเมื่อมีรอบยืนยันยอดหนี้ประจำปีที่เปิดอยู่ (ถึงวันที่ประธานกรรมการกำหนดแล้ว) และครัวเรือนนี้ยังไม่เคยยืนยัน
// ในรอบนั้น — ให้เลือกยืนยันว่ายอดถูกต้อง หรือแจ้งว่ายอดไม่ตรง (พร้อมหมายเหตุ) ยืนยันได้ครั้งเดียวต่อรอบ/ปี
export function DebtConfirmationCard({ year, outstandingTotal }: { year: number; outstandingTotal: number }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "disputing">("idle");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(agreesWithBalance: boolean) {
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/debt-confirmation/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agreesWithBalance, note: agreesWithBalance ? undefined : note || undefined }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? "ส่งข้อมูลไม่สำเร็จ");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-sky-300 bg-sky-50 p-4 dark:border-sky-700 dark:bg-sky-950/40">
      <div className="flex items-start gap-2">
        <ClipboardCheck className="h-6 w-6 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden />
        <div>
          <p className="text-base font-bold text-sky-900 dark:text-sky-200">ยืนยันยอดหนี้ประจำปี {year}</p>
          <p className="text-sm text-sky-800 dark:text-sky-300">
            คณะกรรมการหมู่บ้านให้ครัวเรือนตรวจสอบและยืนยันยอดหนี้คงเหลือของตนเอง ยอดค้างชำระรวมปัจจุบันของท่านคือ{" "}
            <span className="font-bold">{outstandingTotal.toLocaleString("th-TH")} บาท</span>
          </p>
        </div>
      </div>

      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

      {mode === "idle" ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={submitting}
            onClick={() => submit(true)}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
            ยอดถูกต้อง ยืนยันเลย
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => setMode("disputing")}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-rose-300 px-4 text-sm font-semibold text-rose-700 disabled:opacity-60"
          >
            <XCircle className="h-5 w-5 shrink-0" aria-hidden />
            ยอดไม่ตรง แจ้งปัญหา
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">อธิบายว่ายอดไม่ตรงอย่างไร</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="เช่น จำนวนเงินที่คืนไปแล้วไม่ตรงกับที่ระบบแสดง"
            className="rounded-lg border border-slate-300 px-3 py-2 text-base"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => submit(false)}
              className="min-h-11 flex-1 rounded-full bg-rose-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "กำลังส่ง..." : "ส่งแจ้งปัญหา"}
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="min-h-11 rounded-full border border-slate-300 px-4 text-sm font-semibold text-slate-600"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
