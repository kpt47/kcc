"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmDialog } from "@/lib/confirmDialog";
import { ThaiDateField } from "@/components/form/ThaiDateField";

// แก้ไข/ลบแบบขอยืมเงินทุน สำหรับพัฒนาการอำเภอ พัฒนากรตำบล และประธานคณะกรรมการหมู่บ้าน — ต่างจาก
// LoanRequestSelfEditAction (ครัวเรือนแก้ไขเอง เฉพาะก่อนพัฒนากรให้ความเห็น) ตรงที่ใช้ได้ทุกเมื่อไม่มีเงื่อนไขล็อก
// และมีปุ่มลบเพิ่มมาด้วย (ดู lib/authz.ts: canManageProposalOrLoanRequestRecord)
export function LoanRequestManageAction({
  id,
  requestedAmount,
  requestDate,
}: {
  id: number;
  requestedAmount: number;
  requestDate: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(requestedAmount));
  const [date, setDate] = useState(requestDate.slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/loan-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestedAmount: Number(amount), requestDate: date }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? "บันทึกไม่สำเร็จ");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    const confirmed = await confirmDialog({
      title: "ยืนยันการลบแบบขอยืมเงินทุน",
      text: "คุณต้องการลบแบบขอยืมเงินทุนนี้ใช่หรือไม่? ไม่สามารถกู้คืนข้อมูลที่ลบแล้วได้",
      tone: "danger",
      confirmButtonText: "ยืนยันลบ",
    });
    if (!confirmed) return;
    const res = await fetch(`/api/loan-requests/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      await confirmDialog({
        title: "ลบไม่สำเร็จ",
        text: body?.error?.formErrors?.[0] ?? "ไม่สามารถลบข้อมูลนี้ได้",
        tone: "danger",
        confirmButtonText: "รับทราบ",
      }).catch(() => {});
      return;
    }
    router.refresh();
  }

  if (!open) {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-9 items-center rounded-full border border-amber-300 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-50"
        >
          แก้ไข
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="inline-flex min-h-9 items-center rounded-full border border-rose-300 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50"
        >
          ลบ
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="จำนวนเงินที่ขอยืม"
        required
        className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm"
      />
      <ThaiDateField label="วันที่ยื่นคำขอ" required value={date} onChange={(isoDate) => setDate(isoDate ?? "")} />
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="min-h-9 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "กำลังบันทึก..." : "บันทึก"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-9 rounded-lg px-3 text-xs text-slate-500">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
