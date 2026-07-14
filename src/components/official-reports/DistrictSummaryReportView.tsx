"use client";

import { useEffect, useState } from "react";
import { exportRowsAsExcel } from "@/lib/export";
import { SortableHeader } from "./SortableHeader";

type Report1Row = {
  villageName: string;
  totalHouseholds: number;
  targetHouseholds: number;
  householdsWithLoan: number;
  outstandingBalance: number;
  bankBalance: number;
  cashOnHand: number;
  totalFund: number;
  repaidThisYear: number;
};

export function DistrictSummaryReportView() {
  const [budgetYear, setBudgetYear] = useState("");
  const [q, setQ] = useState("");
  const [sortField, setSortField] = useState("villageName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [rows, setRows] = useState<Report1Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (budgetYear) params.set("budgetYear", budgetYear);
    if (q) params.set("q", q);
    params.set("sortField", sortField);
    params.set("sortDir", sortDir);
    fetch(`/api/official-reports/district?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data.rows ?? []);
        setLoading(false);
      });
  }, [budgetYear, q, sortField, sortDir]);

  function handleSort(field: string) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function handleExportExcel() {
    exportRowsAsExcel(
      rows.map((r) => ({
        ชื่อหมู่บ้าน: r.villageName,
        ครัวเรือนทั้งหมด: r.totalHouseholds,
        ครัวเรือนเป้าหมาย: r.targetHouseholds,
        ได้รับเงินยืม: r.householdsWithLoan,
        ยอดเงินคงค้าง: r.outstandingBalance,
        เงินในบัญชีธนาคาร: r.bankBalance,
        เงินในมือ: r.cashOnHand,
        รวมเงินที่มี: r.totalFund,
        ได้รับคืนรอบปี: r.repaidThisYear,
      })),
      "official-report-district"
    );
  }

  const pdfParams = new URLSearchParams();
  if (budgetYear) pdfParams.set("budgetYear", budgetYear);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">ปีงบประมาณ (พ.ศ.)</label>
          <input type="number" value={budgetYear} onChange={(e) => setBudgetYear(e.target.value)} placeholder="เช่น 2555" className="min-h-10 w-32 rounded-lg border border-slate-300 px-2 text-sm" />
        </div>
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อหมู่บ้าน..." className="min-h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm" />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex justify-end gap-2">
          <button type="button" onClick={handleExportExcel} disabled={rows.length === 0} className="inline-flex min-h-9 items-center rounded-lg border border-emerald-300 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
            Export Excel (.xlsx)
          </button>
          <a href={`/api/official-reports/district/pdf?${pdfParams.toString()}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            Export PDF
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <SortableHeader label="ชื่อหมู่บ้าน" field="villageName" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="ครัวเรือนทั้งหมด" field="totalHouseholds" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="ครัวเรือนเป้าหมาย" field="targetHouseholds" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="ได้รับเงินยืม" field="householdsWithLoan" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="ยอดเงินคงค้าง" field="outstandingBalance" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="เงินในบัญชีธนาคาร" field="bankBalance" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="เงินในมือ" field="cashOnHand" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="รวมเงินที่มี" field="totalFund" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="ได้รับคืนรอบปี" field="repaidThisYear" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-8 text-center text-sm text-slate-400">กำลังโหลดข้อมูล...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-sm text-slate-400">ไม่พบหมู่บ้านตามเงื่อนไขที่กำหนด</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.villageName} className="border-b border-slate-100 last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.villageName}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.totalHouseholds}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.targetHouseholds}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.householdsWithLoan}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-amber-800">{r.outstandingBalance.toLocaleString("th-TH")}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.bankBalance.toLocaleString("th-TH")}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.cashOnHand.toLocaleString("th-TH")}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.totalFund.toLocaleString("th-TH")}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.repaidThisYear.toLocaleString("th-TH")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
