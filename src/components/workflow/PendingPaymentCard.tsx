import { formatThaiDate } from "@/lib/formatDate";
import { PendingPaymentAction } from "./PendingPaymentAction";

export type PendingPaymentRow = {
  id: number;
  loanId: number;
  amount: number;
  paymentDate: string;
  transferSlipUrl: string | null;
  householdNote: string | null;
  householdName: string;
  borrowRound: number;
};

export function PendingPaymentCard({ row }: { row: PendingPaymentRow }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-bold text-slate-900">{row.householdName}</p>
          <p className="text-sm text-slate-600">
            ยืมครั้งที่ {row.borrowRound} · แจ้งชำระ {formatThaiDate(row.paymentDate)}
          </p>
        </div>
        <span className="shrink-0 text-base font-bold text-amber-800">{row.amount.toLocaleString("th-TH")} บาท</span>
      </div>

      {row.transferSlipUrl && (
        <a href={row.transferSlipUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={row.transferSlipUrl}
            alt="สลิปโอนเงิน"
            className="h-32 w-32 rounded-lg border border-slate-200 object-cover"
          />
        </a>
      )}
      {row.householdNote && (
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-semibold">ข้อความจากครัวเรือน: </span>
          {row.householdNote}
        </p>
      )}

      <div className="mt-3 border-t border-amber-100 pt-3">
        <PendingPaymentAction loanId={row.loanId} repaymentId={row.id} />
      </div>
    </div>
  );
}
