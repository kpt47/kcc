"use client";

import { useState } from "react";
import { CheckCircle2, Clock3, XCircle, Receipt as ReceiptIcon } from "lucide-react";
import { formatThaiDate } from "@/lib/formatDate";
import { ReceiptModal } from "@/components/receipts/ReceiptModal";
import type { ReceiptData } from "@/components/receipts/ReceiptTemplate";

export type PaymentHistoryRow = {
  id: number;
  amount: number;
  paymentDate: string;
  transferSlipUrl: string | null;
  householdNote: string | null;
  committeeReply: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  installmentNo: number | null;
  outstandingBalanceAfter: number | null;
};

const STATUS_LABEL: Record<PaymentHistoryRow["status"], string> = {
  PENDING: "รอตรวจสอบ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธ",
};

const STATUS_CLASS: Record<PaymentHistoryRow["status"], string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-700",
};

const STATUS_ICON: Record<PaymentHistoryRow["status"], typeof CheckCircle2> = {
  PENDING: Clock3,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
};

export function PaymentHistoryTable({ rows, receiptBase }: { rows: PaymentHistoryRow[]; receiptBase: Omit<ReceiptData, "installmentNo" | "amount" | "paymentDate" | "outstandingBalanceAfter"> }) {
  const [viewingReceipt, setViewingReceipt] = useState<ReceiptData | null>(null);

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        ยังไม่มีประวัติการแจ้งชำระเงิน
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => {
        const StatusIcon = STATUS_ICON[row.status];
        return (
        <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-800">{formatThaiDate(row.paymentDate)}</p>
              <p className="text-sm text-slate-600">{row.amount.toLocaleString("th-TH")} บาท</p>
            </div>
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[row.status]}`}
            >
              <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {STATUS_LABEL[row.status]}
            </span>
          </div>

          {row.transferSlipUrl && (
            <a href={row.transferSlipUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block">
              <img
                src={row.transferSlipUrl}
                alt="สลิปโอนเงิน"
                className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
              />
            </a>
          )}

          {row.householdNote && (
            <p className="mt-2 text-xs text-slate-500">
              <span className="font-semibold">หมายเหตุของคุณ: </span>
              {row.householdNote}
            </p>
          )}
          {row.committeeReply && (
            <p className="mt-1 text-xs text-slate-600">
              <span className="font-semibold">ข้อความจากกรรมการ: </span>
              {row.committeeReply}
            </p>
          )}

          {row.status === "APPROVED" && row.installmentNo !== null && row.outstandingBalanceAfter !== null && (
            <button
              type="button"
              onClick={() =>
                setViewingReceipt({
                  ...receiptBase,
                  installmentNo: row.installmentNo!,
                  amount: row.amount,
                  paymentDate: row.paymentDate,
                  outstandingBalanceAfter: row.outstandingBalanceAfter!,
                })
              }
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-emerald-300 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              <ReceiptIcon className="h-4 w-4 shrink-0" aria-hidden />
              ดาวน์โหลดใบเสร็จรับเงิน (ฟอร์ม 5)
            </button>
          )}
        </div>
        );
      })}

      {viewingReceipt && <ReceiptModal data={viewingReceipt} onClose={() => setViewingReceipt(null)} />}
    </div>
  );
}
