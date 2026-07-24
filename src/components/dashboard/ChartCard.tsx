"use client";

import { useRef, type ReactNode } from "react";
import { ExportMenu } from "./ExportMenu";

export function ChartCard({
  title,
  subtitle,
  filename,
  excelRows,
  children,
}: {
  title: string;
  subtitle?: string;
  filename: string;
  excelRows?: () => Record<string, unknown>[];
  children: ReactNode;
}) {
  const captureRef = useRef<HTMLDivElement>(null);

  return (
    <div className="motion-safe:animate-fadeInUp rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        <ExportMenu targetRef={captureRef} excelRows={excelRows} filename={filename} />
      </div>
      {/* captureRef คือส่วนที่ ExportMenu จับภาพ PNG — ห้ามใส่ animate-fadeInUp/transition ตรงนี้ ต้องอยู่แค่
          div ชั้นนอกเท่านั้น ไม่งั้นอาจ capture ภาพตอน opacity/transform ยังไม่นิ่ง */}
      <div ref={captureRef} className="bg-white dark:bg-slate-900">
        {children}
      </div>
    </div>
  );
}
