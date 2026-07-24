"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { formatThaiDate } from "@/lib/formatDate";
import { confirmDialog } from "@/lib/confirmDialog";
import { ThaiDateField } from "@/components/form/ThaiDateField";

const REPAYMENT_EDIT_WARNING = "การแก้ไขข้อมูลนี้จะส่งผลต่อยอดเงินคงเหลือของสัญญายืมเงินนี้ คุณต้องการดำเนินการต่อหรือไม่?";
const REPAYMENT_DELETE_WARNING = "การลบข้อมูลนี้จะส่งผลต่อยอดเงินคงเหลือของสัญญายืมเงินนี้ คุณต้องการดำเนินการต่อหรือไม่?";

export type RepaymentHistoryRow = {
  id: number;
  paymentDate: string;
  amount: number;
  receiptNo: string | null;
  note: string | null;
  transferSlipUrl: string | null;
};

function EditForm({
  loanId,
  row,
  onCancel,
  onSaved,
}: {
  loanId: number;
  row: RepaymentHistoryRow;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [paymentDate, setPaymentDate] = useState(row.paymentDate.slice(0, 10));
  const [amount, setAmount] = useState(String(row.amount));
  const [receiptNo, setReceiptNo] = useState(row.receiptNo ?? "");
  const [note, setNote] = useState(row.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const confirmed = await confirmDialog({
      title: "ยืนยันการแก้ไขรายการรับชำระ",
      text: REPAYMENT_EDIT_WARNING,
      tone: "danger",
      confirmButtonText: "ยืนยันบันทึก",
    });
    if (!confirmed) return;

    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/loans/${loanId}/repayments/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentDate,
        amount: Number(amount),
        receiptNo: receiptNo || undefined,
        note: note || undefined,
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <ThaiDateField
        label="วันที่ชำระ"
        required
        value={paymentDate}
        onChange={(isoDate) => setPaymentDate(isoDate ?? "")}
      />
      <input
        type="number"
        placeholder="จำนวนเงิน"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm"
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          type="text"
          placeholder="เลขที่ใบสำคัญรับเงิน"
          value={receiptNo}
          onChange={(e) => setReceiptNo(e.target.value)}
          className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm"
        />
        <input
          type="text"
          placeholder="หมายเหตุ"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm"
        />
      </div>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="min-h-9 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "กำลังบันทึก..." : "บันทึก"}
        </button>
        <button type="button" onClick={onCancel} className="min-h-9 rounded-lg px-3 text-xs text-slate-500">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

export function RepaymentHistoryTable({
  loanId,
  rows,
  canManage,
}: {
  loanId: number;
  rows: RepaymentHistoryRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleDelete(id: number) {
    const confirmed = await confirmDialog({
      title: "ยืนยันการลบรายการรับชำระ",
      text: REPAYMENT_DELETE_WARNING,
      tone: "danger",
      confirmButtonText: "ยืนยันลบ",
    });
    if (!confirmed) return;

    setDeletingId(id);
    const res = await fetch(`/api/loans/${loanId}/repayments/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) router.refresh();
  }

  if (rows.length === 0) {
    return <p className="text-xs italic text-slate-400">ยังไม่มีประวัติการคืนเงินที่อนุมัติแล้ว</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white/70">
      <table className="w-full min-w-max text-xs">
        <thead>
          <tr className="border-b border-amber-100 text-left font-semibold uppercase tracking-wide text-slate-500">
            <th className="whitespace-nowrap px-2.5 py-1.5">วันที่คืนเงิน</th>
            <th className="whitespace-nowrap px-2.5 py-1.5">จำนวนเงิน</th>
            <th className="whitespace-nowrap px-2.5 py-1.5">เลขที่ใบสำคัญ</th>
            <th className="whitespace-nowrap px-2.5 py-1.5">หมายเหตุ</th>
            {canManage && <th className="whitespace-nowrap px-2.5 py-1.5">จัดการ</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Fragment key={row.id}>
              <tr className="border-b border-amber-100 last:border-0">
                <td className="whitespace-nowrap px-2.5 py-1.5 text-slate-700">{formatThaiDate(row.paymentDate)}</td>
                <td className="whitespace-nowrap px-2.5 py-1.5 font-semibold text-emerald-700">
                  {row.amount.toLocaleString("th-TH")}
                </td>
                <td className="whitespace-nowrap px-2.5 py-1.5 text-slate-600">{row.receiptNo ?? "-"}</td>
                <td className="px-2.5 py-1.5 text-slate-600">{row.note ?? "-"}</td>
                {canManage && (
                  <td className="whitespace-nowrap px-2.5 py-1.5">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingId(editingId === row.id ? null : row.id)}
                        className="inline-flex min-h-8 items-center rounded-full border border-slate-300 px-2 font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        disabled={deletingId === row.id}
                        className="inline-flex min-h-8 items-center rounded-full border border-rose-300 px-2 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                      >
                        {deletingId === row.id ? "กำลังลบ..." : "ลบ"}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
              {editingId === row.id && canManage && (
                <tr>
                  <td colSpan={5} className="px-2.5 pb-2.5">
                    <EditForm
                      loanId={loanId}
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
