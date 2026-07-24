"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { ExportMenu } from "./ExportMenu";
import { SortableHeader } from "@/components/official-reports/SortableHeader";

// หมายเหตุสำคัญ: ห้ามส่ง function (เช่น render/formatter) เป็น prop จาก Server Component เข้ามาที่นี่
// เพราะ DataTableCard เป็น Client Component — function ไม่สามารถ serialize ข้าม RSC boundary ได้
// ผู้เรียกใช้ต้องคำนวณค่าที่จะแสดงผล (cells) และค่าที่จะ export (excel) ให้เสร็จก่อนส่งเข้ามา
// sortValues เป็น optional — ใส่มาเฉพาะคอลัมน์ที่ต้องการให้จัดเรียงได้ (key ต้องตรงกับ columnKeys ของ DataTableCard)
export type DataTableRow = {
  cells: ReactNode[];
  excel: Record<string, string | number>;
  sortValues?: Record<string, string | number>;
};

export function DataTableCard({
  title,
  subtitle,
  filename,
  columnLabels,
  columnKeys,
  rows,
  emptyMessage = "ไม่มีข้อมูล",
}: {
  title: string;
  subtitle?: string;
  filename: string;
  columnLabels: string[];
  /** ถ้าไม่ส่งมา ตารางนี้จะแสดงหัวคอลัมน์แบบเดิม (คลิกจัดเรียงไม่ได้) — ใส่มาให้ยาวเท่า columnLabels เพื่อเปิดใช้การจัดเรียง */
  columnKeys?: string[];
  rows: DataTableRow[];
  emptyMessage?: string;
}) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sortedRows = useMemo(() => {
    if (!sortField) return rows;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a.sortValues?.[sortField];
      const bv = b.sortValues?.[sortField];
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
    <div className="motion-safe:animate-fadeInUp rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        <ExportMenu targetRef={captureRef} excelRows={() => sortedRows.map((r) => r.excel)} filename={filename} />
      </div>
      <div ref={captureRef} className="overflow-x-auto bg-white dark:bg-slate-900">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">{emptyMessage}</p>
        ) : (
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                {columnLabels.map((label, i) =>
                  columnKeys?.[i] ? (
                    <SortableHeader
                      key={label}
                      label={label}
                      field={columnKeys[i]}
                      sortField={sortField ?? ""}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  ) : (
                    <th key={label} className="whitespace-nowrap px-3 py-2">
                      {label}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  {row.cells.map((cell, j) => (
                    <td key={j} className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-300">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
