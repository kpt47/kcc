"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, MessageSquare, Send } from "lucide-react";
import { EvidenceUploadButton } from "@/components/workflow/EvidenceUploadButton";
import { ThaiDateField } from "@/components/form/ThaiDateField";

export function ReportPaymentForm() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [transferSlipUrl, setTransferSlipUrl] = useState<string | null>(null);
  const [householdNote, setHouseholdNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!transferSlipUrl) {
      setError("กรุณาแนบรูปภาพสลิปโอนเงินก่อนส่ง");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/household/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount),
        paymentDate,
        transferSlipUrl,
        householdNote: householdNote || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(
        body?.error?.formErrors?.[0] ?? body?.error?.fieldErrors?.transferSlipUrl?.[0] ?? "แจ้งชำระเงินไม่สำเร็จ"
      );
      return;
    }
    setSuccess(true);
    setAmount("");
    setTransferSlipUrl(null);
    setHouseholdNote("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <h3 className="text-sm font-bold text-slate-900">แจ้งชำระค่างวด</h3>
      <div>
        <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Banknote className="h-4 w-4 shrink-0" aria-hidden />
          ยอดเงินที่โอน (บาท)
        </label>
        <input
          type="number"
          placeholder="เช่น 1000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base"
        />
      </div>
      <ThaiDateField
        label="วันที่โอนเงิน"
        required
        value={paymentDate}
        onChange={(isoDate) => setPaymentDate(isoDate ?? "")}
      />
      <div>
        <p className="mb-1 text-sm font-semibold text-slate-700">สลิปโอนเงิน (บังคับแนบ)</p>
        <EvidenceUploadButton url={transferSlipUrl} onUploaded={(url) => setTransferSlipUrl(url)} showPreview />
      </div>
      <div>
        <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
          หมายเหตุถึงกรรมการ (ถ้ามี)
        </label>
        <textarea
          placeholder="เช่น โอนช่วงเย็น ขออภัยหากล่าช้า"
          value={householdNote}
          onChange={(e) => setHouseholdNote(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
        />
      </div>
      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
      {success && (
        <p className="text-sm font-medium text-emerald-700">
          แจ้งชำระเงินเรียบร้อยแล้ว รอกรรมการตรวจสอบสลิปและอนุมัติ
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        <Send className="h-4 w-4 shrink-0" aria-hidden />
        {submitting ? "กำลังส่ง..." : "แจ้งชำระเงิน"}
      </button>
    </form>
  );
}
