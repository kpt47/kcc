"use client";

import { useState } from "react";
import { ProvinceSummaryReportView } from "./ProvinceSummaryReportView";
import { FundProblemReportView } from "./FundProblemReportView";

export function ProvinceLevelTabs({ isProvincialAdmin }: { isProvincialAdmin: boolean }) {
  const [tab, setTab] = useState<"summary" | "problems">("summary");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab("summary")}
          className={`min-h-11 border-b-2 px-3 text-sm font-semibold ${tab === "summary" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500"}`}
        >
          แบบ 26(2) สรุประดับจังหวัด
        </button>
        <button
          type="button"
          onClick={() => setTab("problems")}
          className={`min-h-11 border-b-2 px-3 text-sm font-semibold ${tab === "problems" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500"}`}
        >
          รายงานสภาพปัญหาการบริหารเงินทุน
        </button>
      </div>
      {tab === "summary" ? <ProvinceSummaryReportView isProvincialAdmin={isProvincialAdmin} /> : <FundProblemReportView />}
    </div>
  );
}
