"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { exportElementAsPdf, exportElementAsPng, exportRowsAsExcel } from "@/lib/export";

export function ExportMenu({
  targetRef,
  excelRows,
  filename,
}: {
  targetRef: RefObject<HTMLElement | null>;
  excelRows?: () => Record<string, unknown>[];
  filename: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handle(action: "excel" | "pdf" | "png") {
    setOpen(false);
    if (action === "excel") {
      if (excelRows) exportRowsAsExcel(excelRows(), filename);
      return;
    }
    if (!targetRef.current) return;
    setBusy(true);
    try {
      if (action === "pdf") await exportElementAsPdf(targetRef.current, filename);
      else await exportElementAsPng(targetRef.current, filename);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
      >
        {busy ? "กำลัง Export..." : "Export"}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {excelRows && (
            <button
              type="button"
              onClick={() => handle("excel")}
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Download as Excel (.xlsx)
            </button>
          )}
          <button
            type="button"
            onClick={() => handle("pdf")}
            className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Download as PDF (.pdf)
          </button>
          <button
            type="button"
            onClick={() => handle("png")}
            className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Save as Image (.png)
          </button>
        </div>
      )}
    </div>
  );
}
