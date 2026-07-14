"use client";

import { useEffect, useState } from "react";
import { exportRowsAsExcel } from "@/lib/export";
import { SortableHeader } from "./SortableHeader";

type Report2Row = {
  areaName: string;
  budgetYear: number;
  currentFund: number;
  fundShortfall: number;
  cause: string;
  remedy: string;
};

export function FundProblemReportView() {
  const [budgetYear, setBudgetYear] = useState("");
  const [q, setQ] = useState("");
  const [sortField, setSortField] = useState("areaName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [rows, setRows] = useState<Report2Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (budgetYear) params.set("budgetYear", budgetYear);
    if (q) params.set("q", q);
    params.set("sortField", sortField);
    params.set("sortDir", sortDir);
    fetch(`/api/official-reports/fund-problems?${params.toString()}`)
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
        พื้นที่: r.areaName,
        ปีงบประมาณ: r.budgetYear,
        เงินทุนปัจจุบัน: r.currentFund,
        เงินทุนที่ขาดหายไป: r.fundShortfall,
        สาเหตุ: r.cause,
        การแก้ไข: r.remedy,
      })),
      "official-report-fund-problems"
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
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาพื้นที่..." className="min-h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm" />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex justify-end gap-2">
          <button type="button" onClick={handleExportExcel} disabled={rows.length === 0} className="inline-flex min-h-9 items-center rounded-lg border border-emerald-300 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
            Export Excel (.xlsx)
          </button>
          <a href={`/api/official-reports/fund-problems/pdf?${pdfParams.toString()}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            Export PDF
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <SortableHeader label="พื้นที่ (บ้าน/หมู่/ตำบล/อำเภอ)" field="areaName" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="เงินทุนปัจจุบัน" field="currentFund" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="เงินทุนที่ขาดหายไป" field="fundShortfall" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th className="whitespace-nowrap px-3 py-2">สาเหตุ</th>
                <th className="whitespace-nowrap px-3 py-2">การแก้ไข</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-400">กำลังโหลดข้อมูล...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-400">ไม่พบพื้นที่ที่มีปัญหาการบริหารเงินทุนตามเงื่อนไขที่กำหนด</td></tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-slate-700">{r.areaName}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.currentFund.toLocaleString("th-TH")}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-rose-700">{r.fundShortfall.toLocaleString("th-TH")}</td>
                    <td className="px-3 py-2 text-slate-700">{r.cause}</td>
                    <td className="px-3 py-2 text-slate-700">{r.remedy}</td>
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
