"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PendingPaymentAction({ loanId, repaymentId }: { loanId: number; repaymentId: number }) {
  const router = useRouter();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleApprove() {
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/loans/${loanId}/repayments/${repaymentId}/approve`, { method: "POST" });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? "อนุมัติไม่สำเร็จ");
      return;
    }
    router.refresh();
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/loans/${loanId}/repayments/${repaymentId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ committeeReply: reason }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? body?.error?.fieldErrors?.committeeReply?.[0] ?? "ปฏิเสธไม่สำเร็จ");
      return;
    }
    router.refresh();
  }

  if (showReject) {
    return (
      <form onSubmit={handleReject} className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
        <textarea
          placeholder="เหตุผลที่ปฏิเสธ (เช่น สลิปไม่ชัด / ยอดไม่ตรง)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          rows={2}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="min-h-9 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "กำลังบันทึก..." : "ยืนยันการปฏิเสธ"}
          </button>
          <button type="button" onClick={() => setShowReject(false)} className="min-h-9 rounded-lg px-3 text-xs text-slate-500">
            ยกเลิก
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleApprove}
          disabled={submitting}
          className="inline-flex min-h-9 items-center rounded-full bg-emerald-600 px-3 text-xs font-semibold text-white disabled:opacity-60"
        >
          อนุมัติ
        </button>
        <button
          type="button"
          onClick={() => setShowReject(true)}
          disabled={submitting}
          className="inline-flex min-h-9 items-center rounded-full border border-rose-300 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50"
        >
          ปฏิเสธ
        </button>
      </div>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}
