"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { THAI_BANKS } from "@/lib/thaiBanks";

// ยื่นคำขอเปิดบัญชีธนาคารใหม่ให้หมู่บ้าน — บัญชีที่สร้างยังบันทึกฝาก-ถอนไม่ได้จนกว่าจะผ่านการลงนามอนุมัติ
// ครบ 2 ฝ่าย (ประธาน + ฝ่ายการเงิน) ดู BankAccountApproveAction
export function NewBankAccountAction({ villageId }: { villageId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bankName, setBankName] = useState("");
  const [branch, setBranch] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [accountName, setAccountName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/bank-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ villageId, bankName, branch: branch || undefined, accountNo, accountName }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? "ยื่นคำขอไม่สำเร็จ");
      return;
    }
    setOpen(false);
    setBankName("");
    setBranch("");
    setAccountNo("");
    setAccountName("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center rounded-full bg-emerald-600 px-3.5 text-sm font-semibold text-white"
      >
        + ยื่นคำขอเปิดบัญชีธนาคารใหม่
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-sm font-semibold text-slate-700">ยื่นคำขอเปิดบัญชีธนาคารใหม่</p>
      <select
        value={bankName}
        onChange={(e) => setBankName(e.target.value)}
        required
        className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm"
      >
        <option value="">-- เลือกธนาคาร --</option>
        {THAI_BANKS.map((bank) => (
          <option key={bank} value={bank}>
            {bank}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="สาขา (ถ้ามี)"
        value={branch}
        onChange={(e) => setBranch(e.target.value)}
        className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm"
      />
      <input
        type="text"
        placeholder="เลขที่บัญชี"
        value={accountNo}
        onChange={(e) => setAccountNo(e.target.value)}
        required
        className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm"
      />
      <input
        type="text"
        placeholder="ชื่อบัญชี"
        value={accountName}
        onChange={(e) => setAccountName(e.target.value)}
        required
        className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm"
      />
      <p className="text-xs text-slate-500">หลังยื่นคำขอแล้ว ต้องรอลงนามอนุมัติจากประธานและฝ่ายการเงินให้ครบก่อน จึงจะบันทึกรายการฝาก-ถอนได้</p>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="min-h-9 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "กำลังยื่นคำขอ..." : "ยื่นคำขอ"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-9 rounded-lg px-3 text-xs text-slate-500">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
