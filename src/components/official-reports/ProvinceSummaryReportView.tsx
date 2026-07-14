"use client";

import { useEffect, useState } from "react";
import { exportRowsAsExcel } from "@/lib/export";
import { SortableHeader } from "./SortableHeader";

type ProvinceSummaryRow = {
  districtId: number;
  districtName: string;
  subDistrictCount: number;
  villageCount: number;
  totalHouseholds: number;
  targetHouseholds: number;
  householdsWithLoan: number;
  outstandingBalance: number;
  bankBalance: number;
  cashOnHand: number;
  totalFund: number;
  repaidThisYear: number;
};

export function ProvinceSummaryReportView({ isProvincialAdmin }: { isProvincialAdmin: boolean }) {
  const [provinces, setProvinces] = useState<{ id: number; name: string }[]>([]);
  const [provinceId, setProvinceId] = useState("");
  const [budgetYear, setBudgetYear] = useState("");
  const [q, setQ] = useState("");
  const [sortField, setSortField] = useState("districtName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [rows, setRows] = useState<ProvinceSummaryRow[]>([]);
  const [provinceName, setProvinceName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isProvincialAdmin) return;
    fetch("/api/search/areas")
      .then((r) => r.json())
      .then((data) => setProvinces(data.provinces ?? []));
  }, [isProvincialAdmin]);

  useEffect(() => {
    if (!isProvincialAdmin && !provinceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (provinceId) params.set("provinceId", provinceId);
    if (budgetYear) params.set("budgetYear", budgetYear);
    if (q) params.set("q", q);
    params.set("sortField", sortField);
    params.set("sortDir", sortDir);
    fetch(`/api/official-reports/province?${params.toString()}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => null);
          throw new Error(body?.error?.formErrors?.[0] ?? "โหลดข้อมูลไม่สำเร็จ");
        }
        return r.json();
      })
      .then((data) => {
        setRows(data.rows ?? []);
        setProvinceName(data.province?.name ?? "");
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [isProvincialAdmin, provinceId, budgetYear, q, sortField, sortDir]);

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
        ชื่ออำเภอ: r.districtName,
        จำนวนตำบล: r.subDistrictCount,
        จำนวนหมู่บ้าน: r.villageCount,
        ครัวเรือนทั้งหมด: r.totalHouseholds,
        ครัวเรือนเป้าหมาย: r.targetHouseholds,
        จำนวนที่ได้รับเงิน: r.householdsWithLoan,
        ยอดเงินคงค้าง: r.outstandingBalance,
        เงินในบัญชี: r.bankBalance,
        เงินในมือ: r.cashOnHand,
        รวมเงินที่มี: r.totalFund,
        เงินที่ได้รับคืนรอบปี: r.repaidThisYear,
      })),
      "official-report-province"
    );
  }

  const pdfParams = new URLSearchParams();
  if (provinceId) pdfParams.set("provinceId", provinceId);
  if (budgetYear) pdfParams.set("budgetYear", budgetYear);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {!isProvincialAdmin && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">จังหวัด</label>
            <select value={provinceId} onChange={(e) => setProvinceId(e.target.value)} className="min-h-10 rounded-lg border border-slate-300 px-2 text-sm">
              <option value="">-- เลือกจังหวัด --</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">ปีงบประมาณ (พ.ศ.)</label>
          <input type="number" value={budgetYear} onChange={(e) => setBudgetYear(e.target.value)} placeholder="เช่น 2555" className="min-h-10 w-32 rounded-lg border border-slate-300 px-2 text-sm" />
        </div>
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่ออำเภอ..." className="min-h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm" />
      </div>

      {error && <p className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {!isProvincialAdmin && !provinceId ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">กรุณาเลือกจังหวัดเพื่อดูรายงาน</p>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-800">จังหวัด{provinceName}</p>
            <div className="flex gap-2">
              <button type="button" onClick={handleExportExcel} disabled={rows.length === 0} className="inline-flex min-h-9 items-center rounded-lg border border-emerald-300 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                Export Excel (.xlsx)
              </button>
              <a href={`/api/official-reports/province/pdf?${pdfParams.toString()}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Export PDF
              </a>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <SortableHeader label="ชื่ออำเภอ" field="districtName" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="จำนวนตำบล" field="subDistrictCount" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="จำนวนหมู่บ้าน" field="villageCount" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="ครัวเรือนทั้งหมด" field="totalHouseholds" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="ครัวเรือนเป้าหมาย" field="targetHouseholds" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="ได้รับเงิน" field="householdsWithLoan" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="ยอดเงินคงค้าง" field="outstandingBalance" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="เงินในบัญชี" field="bankBalance" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="เงินในมือ" field="cashOnHand" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="รวมเงินที่มี" field="totalFund" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="ได้รับคืนรอบปี" field="repaidThisYear" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="py-8 text-center text-sm text-slate-400">กำลังโหลดข้อมูล...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={11} className="py-8 text-center text-sm text-slate-400">ไม่พบอำเภอตามเงื่อนไขที่กำหนด</td></tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.districtId} className="border-b border-slate-100 last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.districtName}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.subDistrictCount}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.villageCount}</td>
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
      )}
    </div>
  );
}
