"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { formatThaiDate } from "@/lib/thai";
import { EvidenceUploadButton } from "./EvidenceUploadButton";
import { confirmDialog } from "@/lib/confirmDialog";

const LEDGER_EDIT_WARNING = "การแก้ไขข้อมูลนี้จะส่งผลต่อยอดเงินคงเหลือ คุณต้องการดำเนินการต่อหรือไม่?";
const LEDGER_DELETE_WARNING = "การลบข้อมูลนี้จะส่งผลต่อยอดเงินคงเหลือ คุณต้องการดำเนินการต่อหรือไม่?";

export type BankLedgerRow = {
  id: number;
  transactionDate: string;
  documentNo: string | null;
  description: string;
  depositAmount: number;
  withdrawAmount: number;
  balance: number;
  note: string | null;
  passbookImageUrl: string | null;
};

function EditForm({ row, onCancel, onSaved }: { row: BankLedgerRow; onCancel: () => void; onSaved: () => void }) {
  const [transactionDate, setTransactionDate] = useState(row.transactionDate.slice(0, 10));
  const [description, setDescription] = useState(row.description);
  const [documentNo, setDocumentNo] = useState(row.documentNo ?? "");
  const [depositAmount, setDepositAmount] = useState(String(row.depositAmount || ""));
  const [withdrawAmount, setWithdrawAmount] = useState(String(row.withdrawAmount || ""));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const confirmed = await confirmDialog({
      title: "ยืนยันการแก้ไขรายการ",
      text: LEDGER_EDIT_WARNING,
      tone: "danger",
      confirmButtonText: "ยืนยันบันทึก",
    });
    if (!confirmed) return;

    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/bank-transactions/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionDate,
        description,
        documentNo: documentNo || undefined,
        depositAmount: Number(depositAmount) || 0,
        withdrawAmount: Number(withdrawAmount) || 0,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? "บันทึกไม่สำเร็จ");
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm" />
        <input type="text" placeholder="เลขที่เอกสาร" value={documentNo} onChange={(e) => setDocumentNo(e.target.value)} className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm" />
      </div>
      <input type="text" placeholder="รายการ" value={description} onChange={(e) => setDescription(e.target.value)} required className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <input type="number" placeholder="ฝาก" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm" />
        <input type="number" placeholder="ถอน" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm" />
      </div>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="min-h-9 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white disabled:opacity-60">
          {submitting ? "กำลังบันทึก..." : "บันทึก"}
        </button>
        <button type="button" onClick={onCancel} className="min-h-9 rounded-lg px-3 text-xs text-slate-500">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

export function BankLedgerTable({ rows, canManage }: { rows: BankLedgerRow[]; canManage: boolean }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleDelete(id: number) {
    const confirmed = await confirmDialog({
      title: "ยืนยันการลบรายการ",
      text: LEDGER_DELETE_WARNING,
      tone: "danger",
      confirmButtonText: "ยืนยันลบ",
    });
    if (!confirmed) return;
    setDeletingId(id);
    const res = await fetch(`/api/bank-transactions/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) router.refresh();
  }

  async function handleUploaded(id: number, url: string) {
    await fetch(`/api/bank-transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passbookImageUrl: url }),
    });
    router.refresh();
  }

  if (rows.length === 0) {
    return <p className="text-sm italic text-slate-400">ยังไม่มีรายการฝาก-ถอน</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white/70">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-emerald-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="whitespace-nowrap px-3 py-2">วันที่</th>
            <th className="whitespace-nowrap px-3 py-2">รายการ</th>
            <th className="whitespace-nowrap px-3 py-2">ฝาก</th>
            <th className="whitespace-nowrap px-3 py-2">ถอน</th>
            <th className="whitespace-nowrap px-3 py-2">คงเหลือ</th>
            <th className="whitespace-nowrap px-3 py-2">สมุดบัญชี</th>
            {canManage && <th className="whitespace-nowrap px-3 py-2">จัดการ</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Fragment key={row.id}>
              <tr className="border-b border-emerald-100 last:border-0">
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">{formatThaiDate(row.transactionDate)}</td>
                <td className="px-3 py-2 text-slate-700">
                  {row.description}
                  {row.documentNo && <span className="ml-1 text-xs text-slate-400">({row.documentNo})</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-semibold text-emerald-700">
                  {row.depositAmount > 0 ? row.depositAmount.toLocaleString("th-TH") : "-"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-semibold text-red-600">
                  {row.withdrawAmount > 0 ? row.withdrawAmount.toLocaleString("th-TH") : "-"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-900">
                  {row.balance.toLocaleString("th-TH")}
                </td>
                <td className="px-3 py-2">
                  {canManage ? (
                    <EvidenceUploadButton url={row.passbookImageUrl} onUploaded={(url) => handleUploaded(row.id, url)} />
                  ) : row.passbookImageUrl ? (
                    <a href={row.passbookImageUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-emerald-700 underline">
                      ดูรูปภาพ
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">ไม่มีไฟล์แนบ</span>
                  )}
                </td>
                {canManage && (
                  <td className="whitespace-nowrap px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(editingId === row.id ? null : row.id)}
                        className="inline-flex min-h-8 items-center rounded-full border border-slate-300 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        disabled={deletingId === row.id}
                        className="inline-flex min-h-8 items-center rounded-full border border-rose-300 px-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                      >
                        {deletingId === row.id ? "กำลังลบ..." : "ลบ"}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
              {editingId === row.id && (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="px-3 pb-3">
                    <EditForm
                      row={row}
                      onCancel={() => setEditingId(null)}
                      onSaved={() => {
                        setEditingId(null);
                        router.refresh();
                      }}
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
