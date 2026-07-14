"use client";

import { useEffect, useState } from "react";

type Kind = "proposal" | "loan-request";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

interface RiskAssessment {
  level: RiskLevel;
  headline: string;
  reasons: string[];
  dashboard: {
    requestedAmount: number;
    overdueAmount: number;
    annualHouseholdIncome: number | null;
    borrowRound: number;
  };
}

const API_PATH: Record<Kind, string> = {
  proposal: "/api/proposals",
  "loan-request": "/api/loan-requests",
};

const LEVEL_STYLE: Record<RiskLevel, string> = {
  LOW: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  MEDIUM: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  HIGH: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

export function RiskScoreCard({ id, kind }: { id: number; kind: Kind }) {
  const [data, setData] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API_PATH[kind]}/${id}/risk-assessment`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, kind]);

  if (loading) {
    return (
      <div className="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
    );
  }
  if (!data) return null;

  return (
    <div className={`flex flex-col gap-2 rounded-xl border p-3 ${LEVEL_STYLE[data.level]}`}>
      <p className="text-sm font-bold">{data.headline}</p>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="opacity-70">ยอดขอกู้ครั้งนี้</p>
          <p className="font-semibold">{data.dashboard.requestedAmount.toLocaleString("th-TH")} บาท</p>
        </div>
        <div>
          <p className="opacity-70">ประวัติหนี้เสีย</p>
          <p className="font-semibold">
            {data.dashboard.overdueAmount > 0
              ? `ค้างชำระ ${data.dashboard.overdueAmount.toLocaleString("th-TH")} บาท`
              : "ไม่มี"}
          </p>
        </div>
        <div>
          <p className="opacity-70">รายได้เฉลี่ยต่อปี</p>
          <p className="font-semibold">
            {data.dashboard.annualHouseholdIncome != null
              ? `${data.dashboard.annualHouseholdIncome.toLocaleString("th-TH")} บาท`
              : "ไม่มีข้อมูล"}
          </p>
        </div>
      </div>
    </div>
  );
}
