"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PdpaPolicySection } from "@/lib/pdpa";
import { LogoutButton } from "@/components/dashboard/LogoutButton";

// แสดงเต็มหน้าจอทับ AppShell ทั้งหมด (ไม่ render children ของ layout) เพื่อบังคับให้ผู้ใช้ต้องกดยอมรับ
// นโยบาย PDPA เวอร์ชันปัจจุบันก่อน จึงจะเข้าใช้งานหน้าอื่นในระบบได้ — ทางเลือกเดียวนอกจากกดยอมรับคือออกจากระบบ
export function PdpaConsentGate({ sections }: { sections: PdpaPolicySection[] }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/pdpa/accept", { method: "POST" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("บันทึกความยินยอมไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            นโยบายความเป็นส่วนตัว (PDPA)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            กรุณาอ่านและยินยอมก่อนใช้งานระบบ ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex flex-col gap-4 text-sm text-slate-700 dark:text-slate-300">
            {sections.map((s) => (
              <div key={s.heading}>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{s.heading}</p>
                <p className="mt-1 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-700">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            ข้าพเจ้าได้อ่านและยินยอมให้เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลตามที่ระบุไว้ข้างต้น
          </label>

          <div className="mt-4 flex items-center justify-between gap-3">
            <LogoutButton />
            <button
              type="button"
              disabled={!checked || submitting}
              onClick={handleAccept}
              className="inline-flex min-h-11 items-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "กำลังบันทึก..." : "ยอมรับและเข้าใช้งานระบบ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
