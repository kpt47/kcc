"use client";

import { useMemo, useState, type ReactNode } from "react";
import { SortableHeader } from "@/components/official-reports/SortableHeader";

// หมายเหตุสำคัญ: ห้ามส่ง function (เช่น render/formatter/sortValue) เป็น prop จาก Server Component เข้ามาที่นี่
// เพราะ EntityListView เป็น Client Component — function ไม่สามารถ serialize ข้าม RSC boundary ได้ (เหมือนกับ
// DataTableCard) ผู้เรียกใช้ต้องคำนวณ cells (ReactNode)/sortValues (string|number)/card (ReactNode) ให้เสร็จก่อน
export type EntityColumnDef = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
};

export type EntityRow = {
  key: string | number;
  cells: Record<string, ReactNode>;
  sortValues: Record<string, string | number>;
  card: ReactNode;
};

/**
 * มุมมองรายการแบบสลับได้ระหว่าง "ตาราง" (คลิกหัวคอลัมน์เพื่อจัดเรียง) และ "กล่อง" (การ์ดที่ผู้เรียกเตรียมมาให้แล้ว
 * — ใช้เพื่อคงรูปแบบการ์ดเดิมที่มีปุ่มจัดการต่างๆ ของแต่ละหน้าไว้ครบ ไม่ต้องเขียนใหม่)
 */
export function EntityListView({
  rows,
  columns,
  defaultSortField,
  emptyMessage = "ไม่พบข้อมูล",
  defaultView = "cards",
}: {
  rows: EntityRow[];
  columns: EntityColumnDef[];
  defaultSortField: string;
  emptyMessage?: string;
  defaultView?: "table" | "cards";
}) {
  const [view, setView] = useState<"table" | "cards">(defaultView);
  const [sortField, setSortField] = useState(defaultSortField);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a.sortValues[sortField];
      const bv = b.sortValues[sortField];
      const dir = sortDir === "asc" ? 1 : -1;
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv, "th") * dir;
      return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
    });
  }, [rows, sortField, sortDir]);

  function handleSort(field: string) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
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
              {sorted.map((row) => (
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
          {sorted.map((row) => (
            <div key={row.key}>{row.card}</div>
          ))}
        </div>
      )}
    </div>
  );
}
