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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        <ExportMenu targetRef={captureRef} excelRows={excelRows} filename={filename} />
      </div>
      <div ref={captureRef} className="bg-white">
        {children}
      </div>
    </div>
  );
}
