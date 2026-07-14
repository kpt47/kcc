"use client";

import { useRef, type ReactNode } from "react";
import { ExportMenu } from "./ExportMenu";

// หมายเหตุสำคัญ: ห้ามส่ง function (เช่น render/formatter) เป็น prop จาก Server Component เข้ามาที่นี่
// เพราะ DataTableCard เป็น Client Component — function ไม่สามารถ serialize ข้าม RSC boundary ได้
// ผู้เรียกใช้ต้องคำนวณค่าที่จะแสดงผล (cells) และค่าที่จะ export (excel) ให้เสร็จก่อนส่งเข้ามา
export type DataTableRow = {
  cells: ReactNode[];
  excel: Record<string, string | number>;
};

export function DataTableCard({
  title,
  subtitle,
  filename,
  columnLabels,
  rows,
  emptyMessage = "ไม่มีข้อมูล",
}: {
  title: string;
  subtitle?: string;
  filename: string;
  columnLabels: string[];
  rows: DataTableRow[];
  emptyMessage?: string;
}) {
  const captureRef = useRef<HTMLDivElement>(null);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        <ExportMenu targetRef={captureRef} excelRows={() => rows.map((r) => r.excel)} filename={filename} />
      </div>
      <div ref={captureRef} className="overflow-x-auto bg-white">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">{emptyMessage}</p>
        ) : (
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {columnLabels.map((label) => (
                  <th key={label} className="whitespace-nowrap px-3 py-2">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  {row.cells.map((cell, j) => (
                    <td key={j} className="whitespace-nowrap px-3 py-2 text-slate-700">
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
