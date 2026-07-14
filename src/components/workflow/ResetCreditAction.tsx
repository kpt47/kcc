"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmDialog } from "@/lib/confirmDialog";

export function ResetCreditAction({ householdId }: { householdId: number }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleReset() {
    const confirmed = await confirmDialog({
      title: "รีเซ็ตสถานะเครดิต",
      text: 'คุณต้องการรีเซ็ตสถานะเครดิตของลูกหนี้รายนี้ให้กลับเป็น "ปกติ" ใช่หรือไม่? (การกระทำนี้ควรทำเมื่อมีการประนอมหนี้หรือชำระหนี้แล้วเท่านั้น)',
      tone: "danger",
      confirmButtonText: "ยืนยันรีเซ็ต",
    });
    if (!confirmed) return;

    setSubmitting(true);
    const res = await fetch(`/api/households/${householdId}/reset-credit`, { method: "POST" });
    setSubmitting(false);
    if (res.ok) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleReset}
      disabled={submitting}
      className="inline-flex min-h-9 items-center rounded-full border border-sky-300 px-3 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-60"
    >
      {submitting ? "กำลังรีเซ็ต..." : "รีเซ็ตเครดิต"}
    </button>
  );
}
