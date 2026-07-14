"use client";

import { useRef, useState } from "react";
import { exportElementAsPdf } from "@/lib/export";
import { ReceiptTemplate, type ReceiptData } from "./ReceiptTemplate";

export function ReceiptModal({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  async function handlePrint() {
    if (!receiptRef.current) return;
    setDownloading(true);
    await exportElementAsPdf(receiptRef.current, `receipt-${data.payerName}-${data.paymentDate}`);
    setDownloading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">ใบเสร็จรับเงิน</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={downloading}
              className="inline-flex min-h-9 items-center rounded-full bg-emerald-600 px-3.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {downloading ? "กำลังสร้าง PDF..." : "พิมพ์ใบเสร็จ (PDF)"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-9 items-center rounded-full border border-slate-300 px-3.5 text-xs font-medium text-slate-600"
            >
              ปิด
            </button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <div ref={receiptRef}>
            <ReceiptTemplate data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
