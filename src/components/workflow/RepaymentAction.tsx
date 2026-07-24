"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EvidenceUploadButton } from "./EvidenceUploadButton";
import { ThaiDateField } from "@/components/form/ThaiDateField";
import { ReceiptModal } from "@/components/receipts/ReceiptModal";
import type { ReceiptData } from "@/components/receipts/ReceiptTemplate";

export type ReceiptContext = {
  villageName: string;
  villageNo: string;
  subDistrictName: string;
  districtName: string;
  provinceName: string;
  payerName: string;
  contractNo: string | null;
  chairmanName: string | null;
  financeOrSecretaryName: string | null;
};

export function RepaymentAction({
  loanId,
  receiptContext,
  existingRepaymentCount,
}: {
  loanId: number;
  receiptContext: ReceiptContext;
  existingRepaymentCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [receiptNo, setReceiptNo] = useState("");
  const [transferSlipUrl, setTransferSlipUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/loans/${loanId}/repayments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount),
        paymentDate,
        receiptNo: receiptNo || undefined,
        transferSlipUrl: transferSlipUrl || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? "บันทึกไม่สำเร็จ");
      return;
    }
    const result = await res.json();
    setLastReceipt({
      ...receiptContext,
      installmentNo: existingRepaymentCount + 1,
      amount: Number(amount),
      paymentDate,
      outstandingBalanceAfter: result.loan.outstandingBalance,
    });
    setOpen(false);
    setAmount("");
    setReceiptNo("");
    setTransferSlipUrl(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {!open ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-9 items-center rounded-full border border-amber-300 px-3 text-xs font-semibold text-amber-800 hover:bg-amber-50"
          >
            + บันทึกรับชำระ / ออกใบเสร็จ
          </button>
          {lastReceipt && (
            <button
              type="button"
              onClick={() => setShowReceipt(true)}
              className="inline-flex min-h-9 items-center rounded-full border border-emerald-300 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              พิมพ์ใบเสร็จล่าสุด
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="number"
              placeholder="จำนวนเงิน (บาท)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm"
            />
            <input
              type="text"
              placeholder="เลขที่ใบเสร็จ"
              value={receiptNo}
              onChange={(e) => setReceiptNo(e.target.value)}
              className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm"
            />
          </div>
          <ThaiDateField
            label="วันที่ชำระ"
            required
            value={paymentDate}
            onChange={(isoDate) => setPaymentDate(isoDate ?? "")}
          />
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">สลิปโอนเงิน (ถ้ามี)</p>
            <EvidenceUploadButton url={transferSlipUrl} onUploaded={(url) => setTransferSlipUrl(url)} />
          </div>
          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="min-h-9 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "กำลังบันทึก..." : "บันทึกรับชำระ"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="min-h-9 rounded-lg px-3 text-xs text-slate-500">
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      {showReceipt && lastReceipt && <ReceiptModal data={lastReceipt} onClose={() => setShowReceipt(false)} />}
    </div>
  );
}
