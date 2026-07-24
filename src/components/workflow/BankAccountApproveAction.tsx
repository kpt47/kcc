"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmDialog } from "@/lib/confirmDialog";

// ลงนามอนุมัติเปิดบัญชีธนาคารใหม่ — Multi-signature ต้องมีทั้งประธานและฝ่ายการเงิน คนละคนกัน
export function BankAccountApproveAction({
  accountId,
  chairmanApproved,
  financeApproved,
  canSignChairman,
  canSignFinance,
}: {
  accountId: number;
  chairmanApproved: boolean;
  financeApproved: boolean;
  canSignChairman: boolean;
  canSignFinance: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"chairman" | "finance" | null>(null);

  async function sign(as: "chairman" | "finance") {
    const confirmed = await confirmDialog({
      title: as === "chairman" ? "ยืนยันการลงนามในฐานะประธาน" : "ยืนยันการลงนามในฐานะฝ่ายการเงิน",
      text: "คุณแน่ใจหรือไม่ที่จะลงนามอนุมัติเปิดบัญชีนี้? เมื่อยืนยันแล้วจะยกเลิกไม่ได้",
      confirmButtonText: "ยืนยันลงนาม",
    });
    if (!confirmed) return;

    setError(null);
    setSubmitting(as);
    const res = await fetch(`/api/bank-accounts/${accountId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ as }),
    });
    setSubmitting(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? "ลงนามไม่สำเร็จ");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-800">รอลงนามอนุมัติเปิดบัญชี ({chairmanApproved ? "✓" : "○"} ประธาน / {financeApproved ? "✓" : "○"} ฝ่ายการเงิน)</p>
      <p className="text-xs text-amber-700">ต้องมีลายเซ็นครบทั้งสองฝ่ายก่อน จึงจะบันทึกรายการฝาก-ถอนในบัญชีนี้ได้</p>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {canSignChairman && !chairmanApproved && (
          <button
            type="button"
            onClick={() => sign("chairman")}
            disabled={submitting !== null}
            className="min-h-9 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white disabled:opacity-60"
          >
            {submitting === "chairman" ? "กำลังลงนาม..." : "ลงนามในฐานะประธาน"}
          </button>
        )}
        {canSignFinance && !financeApproved && (
          <button
            type="button"
            onClick={() => sign("finance")}
            disabled={submitting !== null}
            className="min-h-9 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white disabled:opacity-60"
          >
            {submitting === "finance" ? "กำลังลงนาม..." : "ลงนามในฐานะฝ่ายการเงิน"}
          </button>
        )}
      </div>
    </div>
  );
}
