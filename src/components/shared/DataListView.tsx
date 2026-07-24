"use client";

import { useMemo, useState, type ReactNode } from "react";
import { SortableHeader } from "@/components/official-reports/SortableHeader";

// หมายเหตุสำคัญ: ห้ามส่ง function (เช่น render/formatter/sortValue) เป็น prop จาก Server Component เข้ามาที่นี่
// เพราะ DataListView เป็น Client Component — function ไม่สามารถ serialize ข้าม RSC boundary ได้ (เหมือนกับ
// EntityListView/SearchSortList เดิม) ผู้เรียกใช้ต้องคำนวณ cells/card/searchText/sortValues ให้เสร็จก่อน
export type DataListColumnDef = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
};

export type DataListRow = {
  key: string | number;
  searchText: string; // ข้อความรวมทุกฟิลด์ที่ต้องการให้ค้นหาเจอ (ผู้เรียกใช้ทำ .toLowerCase() มาให้แล้ว)
  cells: Record<string, ReactNode>;
  sortValues: Record<string, string | number>;
  card: ReactNode;
};

const DEFAULT_PAGE_SIZE_OPTIONS = [50, 100, 250, 500];

/**
 * รายการข้อมูลแบบครบเครื่อง — รวมความสามารถของ SearchSortList (ค้นหา+จัดเรียง) กับ EntityListView
 * (สลับมุมมองตาราง/กล่อง) เข้าด้วยกัน พร้อมเพิ่มตัวเลือกจำนวนรายการต่อหน้า + การแบ่งหน้า (ทำฝั่ง client
 * ทั้งหมดจากข้อมูลที่ดึงมาครบแล้ว — เหมาะกับหน้าที่มีจำนวนแถวระดับร้อย-พันรายการ ไม่ใช่หลักแสนแบบ Audit Log)
 */
export function DataListView({
  rows,
  columns,
  defaultSortField,
  emptyMessage = "ไม่พบข้อมูล",
  defaultView = "cards",
  searchPlaceholder = "ค้นหา...",
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  defaultPageSize = DEFAULT_PAGE_SIZE_OPTIONS[0],
}: {
  rows: DataListRow[];
  columns: DataListColumnDef[];
  defaultSortField: string;
  emptyMessage?: string;
  defaultView?: "table" | "cards";
  searchPlaceholder?: string;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
}) {
  const [view, setView] = useState<"table" | "cards">(defaultView);
  const [q, setQ] = useState("");
  const [sortField, setSortField] = useState(defaultSortField);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return query ? rows.filter((r) => r.searchText.includes(query)) : rows;
  }, [rows, q]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a.sortValues[sortField];
      const bv = b.sortValues[sortField];
      const dir = sortDir === "asc" ? 1 : -1;
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv, "th") * dir;
      return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function handleSort(field: string) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setQ(value);
    setPage(1);
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={q}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm sm:max-w-xs dark:border-slate-700 dark:bg-slate-900"
        />
        <div className="flex shrink-0 items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">แสดง:</label>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} รายการ
              </option>
            ))}
          </select>
          <div className="flex gap-1 rounded-lg border border-slate-300 p-1">
            <button
              type="button"
              onClick={() => setView("table")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${view === "table" ? "bg-slate-800 text-white" : "text-slate-600"}`}
            >
              📋 ตาราง
            </button>
            <button
              type="button"
              onClick={() => setView("cards")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${view === "cards" ? "bg-slate-800 text-white" : "text-slate-600"}`}
            >
              🔲 กล่อง
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        พบ {sorted.length.toLocaleString("th-TH")} รายการ{q.trim() ? ` (จากทั้งหมด ${rows.length.toLocaleString("th-TH")} รายการ)` : ""}
      </p>

      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{emptyMessage}</p>
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {columns.map((c) => (
                  <SortableHeader key={c.key} label={c.label} field={c.key} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.key} className="border-b border-slate-100 last:border-0">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`whitespace-nowrap px-3 py-2 text-slate-700 ${
                        c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                      }`}
                    >
                      {row.cells[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {pageRows.map((row) => (
            <div key={row.key}>{row.card}</div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-600 disabled:opacity-40"
          >
            ก่อนหน้า
          </button>
          <span className="text-sm text-slate-500">
            หน้า {currentPage} จาก {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-600 disabled:opacity-40"
          >
            ถัดไป
          </button>
        </div>
      )}
    </div>
  );
}
