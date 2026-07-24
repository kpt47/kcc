"use client";

import { useEffect, useState } from "react";
import { exportRowsAsExcel } from "@/lib/export";
import { SortableHeader } from "./SortableHeader";

type Report3Row = {
  villageName: string;
  targetHouseholds: number;
  targetMembers: number;
  householdsWithLoan: number;
  membersWithLoan: number;
  totalFund: number;
  activeHouseholds: number;
  activeAmount: number;
  bankBalance: number;
  fundShortfall: number;
  defaultedHouseholds: number;
  defaultedAmount: number;
};

export function VillageDatabaseReportView() {
  const [budgetYear, setBudgetYear] = useState("");
  const [q, setQ] = useState("");
  const [sortField, setSortField] = useState("villageName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [rows, setRows] = useState<Report3Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (budgetYear) params.set("budgetYear", budgetYear);
    if (q) params.set("q", q);
    params.set("sortField", sortField);
    params.set("sortDir", sortDir);
    fetch(`/api/official-reports/village-database?${params.toString()}`)
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
        "ครัวเรือนเป้าหมาย (ก)": r.targetHouseholds,
        "คน (ข)": r.targetMembers,
        "ได้รับเงินยืม (ค)": r.householdsWithLoan,
        "คน (ง)": r.membersWithLoan,
        "เงินทุนโครงการทั้งหมด (ช)": r.totalFund,
        "ครัวเรือนยืมคงค้าง (ซ)": r.activeHouseholds,
        "เงินยืมคงค้าง (ฌ)": r.activeAmount,
        "เงินฝากธนาคาร (ญ)": r.bankBalance,
        "เงินทุนที่ขาดหายไป (ฎ)": r.fundShortfall,
        "ครัวเรือนผิดนัด (ฐ)": r.defaultedHouseholds,
        "เงินยืมผิดนัด (ฑ)": r.defaultedAmount,
      })),
      "official-report-village-database"
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
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาหมู่บ้าน..." className="min-h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm" />
      </div>

      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
        คอลัมน์ "รายได้ผ่านเกณฑ์ จปฐ." และ "ระดับการพัฒนา/หน่วยงานสนับสนุนอื่น" ไม่มีข้อมูลจริงรองรับในระบบ
        (ไม่มีค่าเกณฑ์ จปฐ. เก็บไว้ / เป็นผลประเมินเชิงอัตนัยรายปี) จึงแสดงเป็นขีด "-" ให้กรอกเพิ่มเติมด้วยมือ
      </p>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex justify-end gap-2">
          <button type="button" onClick={handleExportExcel} disabled={rows.length === 0} className="inline-flex min-h-9 items-center rounded-lg border border-emerald-300 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
            Export Excel (.xlsx)
          </button>
          <a href={`/api/official-reports/village-database/pdf?${pdfParams.toString()}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            Export PDF
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <SortableHeader label="ชื่อหมู่บ้าน" field="villageName" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="ครัวเรือนเป้าหมาย" field="targetHouseholds" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="คน" field="targetMembers" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="ได้รับเงินยืม" field="householdsWithLoan" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="เงินทุนทั้งหมด" field="totalFund" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="ยืมคงค้าง (ครัวเรือน)" field="activeHouseholds" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="เงินฝากธนาคาร" field="bankBalance" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="เงินทุนขาดหายไป" field="fundShortfall" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="ผิดนัด (ครัวเรือน)" field="defaultedHouseholds" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="เงินยืมผิดนัด" field="defaultedAmount" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="py-8 text-center text-sm text-slate-400">กำลังโหลดข้อมูล...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={10} className="py-8 text-center text-sm text-slate-400">ไม่พบหมู่บ้านตามเงื่อนไขที่กำหนด</td></tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.villageName}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.targetHouseholds}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.targetMembers}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.householdsWithLoan}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.totalFund.toLocaleString("th-TH")}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.activeHouseholds}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.bankBalance.toLocaleString("th-TH")}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.fundShortfall.toLocaleString("th-TH")}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-rose-700">{r.defaultedHouseholds}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-rose-700">{r.defaultedAmount.toLocaleString("th-TH")}</td>
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
