"use client";

import { useState } from "react";
import { formatThaiDate } from "@/lib/thai";
import { THEMES } from "@/lib/theme";
import { RepaymentAction } from "./RepaymentAction";
import { RepaymentHistoryTable, type RepaymentHistoryRow } from "./RepaymentHistoryTable";
import { ResetCreditAction } from "./ResetCreditAction";

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 5a2 2 0 0 1 2-2h2.28a1 1 0 0 1 .97.76l.7 2.8a1 1 0 0 1-.4 1.06l-1.6 1.2a12.05 12.05 0 0 0 5.19 5.19l1.2-1.6a1 1 0 0 1 1.06-.4l2.8.7a1 1 0 0 1 .76.97V19a2 2 0 0 1-2 2h-1C7.82 21 3 16.18 3 10.5V5z"
      />
    </svg>
  );
}

type RiskStatus = "NORMAL" | "WATCHLIST" | "HIGH_RISK";

const RISK_LABEL: Record<RiskStatus, string> = {
  NORMAL: "ปกติ",
  WATCHLIST: "เฝ้าระวัง",
  HIGH_RISK: "เสี่ยงสูง",
};

const RISK_BADGE_CLASS: Record<RiskStatus, string> = {
  NORMAL: "bg-emerald-100 text-emerald-800",
  WATCHLIST: "bg-yellow-100 text-yellow-800",
  HIGH_RISK: "bg-rose-100 text-rose-700",
};

export type LoanRiskRow = {
  id: number;
  householdId: number;
  borrowRound: number;
  isClosed: boolean;
  riskStatus: RiskStatus;
  receivedDate: string;
  amount: number;
  outstandingBalance: number;
  headFirstName: string;
  headLastName: string;
  householdPhone: string | null;
  villageNo: string;
  villageName: string;
  subDistrictName: string;
  districtName: string;
  provinceName: string;
  contractNo: string | null;
  chairmanName: string | null;
  financeOrSecretaryName: string | null;
  approvedRepayments: RepaymentHistoryRow[];
};

export function LoanRiskFilterList({
  loans,
  showRepaymentAction,
  showEditDeleteRepayment,
  showResetCredit,
}: {
  loans: LoanRiskRow[];
  showRepaymentAction: boolean;
  showEditDeleteRepayment: boolean;
  showResetCredit: boolean;
}) {
  const [filter, setFilter] = useState<"all" | "WATCHLIST" | "HIGH_RISK">("all");

  const filteredLoans = loans.filter((loan) => filter === "all" || loan.riskStatus === filter);
  const theme = THEMES.yellow;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold text-slate-500">กรองตามสถานะเครดิต:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as "all" | "WATCHLIST" | "HIGH_RISK")}
          className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm"
        >
          <option value="all">ทั้งหมด</option>
          <option value="WATCHLIST">เฝ้าระวัง</option>
          <option value="HIGH_RISK">เสี่ยงสูง</option>
        </select>
      </div>

      {filteredLoans.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          ไม่พบรายการที่ตรงกับตัวกรองนี้
        </p>
      ) : (
        filteredLoans.map((loan) => (
          <div key={loan.id} className={`flex flex-col gap-3 rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-4`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={`text-base font-bold ${theme.headingText}`}>
                  {loan.headFirstName} {loan.headLastName}
                </p>
                <p className="text-sm text-slate-600">
                  หมู่ {loan.villageNo} บ้าน{loan.villageName} · ยืมครั้งที่ {loan.borrowRound}
                </p>
                {loan.householdPhone && (
                  <a
                    href={`tel:${loan.householdPhone}`}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    <PhoneIcon />
                    {loan.householdPhone}
                  </a>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    loan.isClosed ? "bg-slate-200 text-slate-700" : `${theme.badgeBg} ${theme.badgeText}`
                  }`}
                >
                  {loan.isClosed ? "ปิดสัญญาแล้ว" : "อยู่ระหว่างผ่อนชำระ"}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${RISK_BADGE_CLASS[loan.riskStatus]}`}>
                  สถานะเครดิต: {RISK_LABEL[loan.riskStatus]}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="วันที่รับเงินยืม" value={formatThaiDate(loan.receivedDate)} />
              <Stat label="จำนวนเงินยืม" value={`${loan.amount.toLocaleString("th-TH")} บาท`} />
              <Stat
                label="คืนแล้วสะสม"
                value={`${loan.approvedRepayments.reduce((sum, r) => sum + r.amount, 0).toLocaleString("th-TH")} บาท`}
              />
              <Stat
                label="ยอดค้างชำระ"
                value={`${loan.outstandingBalance.toLocaleString("th-TH")} บาท`}
                warn={loan.outstandingBalance > 0 && !loan.isClosed}
              />
            </div>

            {showRepaymentAction && !loan.isClosed && (
              <RepaymentAction
                loanId={loan.id}
                existingRepaymentCount={loan.approvedRepayments.length}
                receiptContext={{
                  villageName: loan.villageName,
                  villageNo: loan.villageNo,
                  subDistrictName: loan.subDistrictName,
                  districtName: loan.districtName,
                  provinceName: loan.provinceName,
                  payerName: `${loan.headFirstName} ${loan.headLastName}`,
                  contractNo: loan.contractNo,
                  chairmanName: loan.chairmanName,
                  financeOrSecretaryName: loan.financeOrSecretaryName,
                }}
              />
            )}

            {showResetCredit && (
              <div className="flex justify-end">
                <ResetCreditAction householdId={loan.householdId} />
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 text-xs">
              <a
                href={`/api/loans/${loan.id}/contract-pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-3 font-semibold text-slate-600 hover:bg-slate-50"
              >
                พิมพ์สัญญายืมเงิน (PDF)
              </a>
              <a
                href={`/api/loans/${loan.id}/voucher-pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-3 font-semibold text-slate-600 hover:bg-slate-50"
              >
                พิมพ์ใบสำคัญจ่ายเงิน (PDF)
              </a>
            </div>

            {showRepaymentAction && (
              <details className="rounded-xl border border-amber-100 bg-white/50 px-3 py-2">
                <summary className="cursor-pointer text-xs font-semibold text-amber-800">
                  ประวัติการคืนเงิน ({loan.approvedRepayments.length} รายการ)
                </summary>
                <div className="mt-2">
                  <RepaymentHistoryTable loanId={loan.id} rows={loan.approvedRepayments} canManage={showEditDeleteRepayment} />
                </div>
              </details>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl bg-white/70 p-2.5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-sm font-bold ${warn ? "text-amber-800" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}
