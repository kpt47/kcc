"use client";

import { exportRowsAsExcel } from "@/lib/export";
import type { SmartFilters, SmartSearchRow } from "./types";
import { buildSearchParams } from "./types";

const RISK_LABEL: Record<string, string> = { NORMAL: "ปกติ", WATCHLIST: "เฝ้าระวัง", HIGH_RISK: "เสี่ยงสูง" };
const RISK_BADGE_CLASS: Record<string, string> = {
  NORMAL: "bg-emerald-100 text-emerald-800",
  WATCHLIST: "bg-yellow-100 text-yellow-800",
  HIGH_RISK: "bg-rose-100 text-rose-700",
};

const COLUMNS: { field: SmartFilters["sortField"]; label: string }[] = [
  { field: "sequenceNo", label: "ลำดับที่" },
  { field: "headFirstName", label: "ชื่อ-สกุล" },
  { field: "incomeBeforeLoan", label: "รายได้ก่อนยืม" },
  { field: "outstandingBalance", label: "หนี้คงค้าง" },
  { field: "riskStatus", label: "สถานะเครดิต" },
];

export function SmartReportTable({
  rows,
  total,
  filters,
  onChange,
  loading,
  onDrillDownVillage,
}: {
  rows: SmartSearchRow[];
  total: number;
  filters: SmartFilters;
  onChange: (next: Partial<SmartFilters>) => void;
  loading: boolean;
  onDrillDownVillage?: number | null;
}) {
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  function handleSort(field: SmartFilters["sortField"]) {
    if (filters.sortField === field) {
      onChange({ sortDir: filters.sortDir === "asc" ? "desc" : "asc", page: 1 });
    } else {
      onChange({ sortField: field, sortDir: "asc", page: 1 });
    }
  }

  function handleExportExcel() {
    exportRowsAsExcel(
      rows.map((r) => ({
        ลำดับที่: r.sequenceNo,
        "ชื่อ-สกุล": `${r.headFirstName} ${r.headLastName}`,
        หมู่บ้าน: `หมู่ ${r.villageNo} บ้าน${r.villageName}`,
        ตำบล: r.subDistrictName,
        อำเภอ: r.districtName,
        จังหวัด: r.provinceName,
        อาชีพ: r.occupation ?? "",
        รายได้ก่อนยืม: r.incomeBeforeLoan ?? "",
        หนี้คงค้าง: r.outstandingBalance,
        สถานะเครดิต: RISK_LABEL[r.riskStatus],
      })),
      "smart-report-households"
    );
  }

  const pdfHref = `/api/search/households/pdf?${buildSearchParams(filters).toString()}`;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          พบ {total.toLocaleString("th-TH")} รายการ{onDrillDownVillage ? " (กรองตามหมู่บ้านที่เลือกจากแผนที่)" : ""}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={rows.length === 0}
            className="inline-flex min-h-9 items-center rounded-lg border border-emerald-300 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            Export Excel (.xlsx)
          </button>
          <a
            href={pdfHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Export PDF (แบบรายงานภาวะหนี้สินฯ)
          </a>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              {COLUMNS.map((col) => (
                <th key={col.field} className="whitespace-nowrap px-3 py-2">
                  <button type="button" onClick={() => handleSort(col.field)} className="inline-flex items-center gap-1 hover:text-emerald-700">
                    {col.label}
                    {filters.sortField === col.field && <span>{filters.sortDir === "asc" ? "▲" : "▼"}</span>}
                  </button>
                </th>
              ))}
              <th className="whitespace-nowrap px-3 py-2">พื้นที่</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-slate-400">
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-slate-400">
                  ไม่พบข้อมูลตามเงื่อนไขที่กำหนด
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.sequenceNo}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                    {r.headFirstName} {r.headLastName}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                    {r.incomeBeforeLoan != null ? r.incomeBeforeLoan.toLocaleString("th-TH") : "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-amber-800">{r.outstandingBalance.toLocaleString("th-TH")}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RISK_BADGE_CLASS[r.riskStatus]}`}>
                      {RISK_LABEL[r.riskStatus]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">
                    หมู่ {r.villageNo} บ้าน{r.villageName} ต.{r.subDistrictName}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-2 text-sm">
        <button
          type="button"
          onClick={() => onChange({ page: Math.max(1, filters.page - 1) })}
          disabled={filters.page <= 1}
          className="min-h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 disabled:opacity-40"
        >
          ก่อนหน้า
        </button>
        <span className="text-xs text-slate-500">
          หน้า {filters.page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onChange({ page: Math.min(totalPages, filters.page + 1) })}
          disabled={filters.page >= totalPages}
          className="min-h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 disabled:opacity-40"
        >
          ถัดไป
        </button>
      </div>
    </div>
  );
}
