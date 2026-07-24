"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThaiDateField } from "@/components/form/ThaiDateField";
import { EvidenceUploadButton } from "./EvidenceUploadButton";

export function BankTransactionAction({ bankAccountId }: { bankAccountId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [documentNo, setDocumentNo] = useState("");
  const [passbookImageUrl, setPassbookImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/bank-transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bankAccountId,
        transactionDate,
        documentNo: documentNo || undefined,
        description,
        depositAmount: type === "deposit" ? Number(amount) : 0,
        withdrawAmount: type === "withdraw" ? Number(amount) : 0,
        passbookImageUrl: passbookImageUrl || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? "บันทึกไม่สำเร็จ");
      return;
    }
    setOpen(false);
    setAmount("");
    setDescription("");
    setDocumentNo("");
    setPassbookImageUrl(null);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 items-center rounded-full border border-emerald-300 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
      >
        + บันทึกรายการฝาก-ถอน
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
      <div className="flex gap-2">
        <label className="flex items-center gap-1.5 text-sm text-slate-700">
          <input type="radio" checked={type === "deposit"} onChange={() => setType("deposit")} /> ฝาก
        </label>
        <label className="flex items-center gap-1.5 text-sm text-slate-700">
          <input type="radio" checked={type === "withdraw"} onChange={() => setType("withdraw")} /> ถอน
        </label>
      </div>
      <input
        type="number"
        placeholder="จำนวนเงิน (บาท)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm"
      />
      <ThaiDateField
        label="วันที่ทำรายการ"
        required
        value={transactionDate}
        onChange={(isoDate) => setTransactionDate(isoDate ?? "")}
      />
      <input
        type="text"
        placeholder="รายการ"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
        className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm"
      />
      <input
        type="text"
        placeholder="เลขที่เอกสาร (ถ้ามี)"
        value={documentNo}
        onChange={(e) => setDocumentNo(e.target.value)}
        className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm"
      />
      <div>
        <p className="mb-1 text-xs font-semibold text-slate-500">รูปสมุดบัญชี/หลักฐานประกอบ (ถ้ามี)</p>
        <EvidenceUploadButton url={passbookImageUrl} onUploaded={(url) => setPassbookImageUrl(url)} showPreview />
      </div>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="min-h-9 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "กำลังบันทึก..." : "บันทึกรายการ"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-9 rounded-lg px-3 text-xs text-slate-500">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
