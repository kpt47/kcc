"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { PendingPaymentCard, type PendingPaymentRow } from "./PendingPaymentCard";

export function LoansPageTabs({
  overview,
  pendingPayments,
}: {
  overview: ReactNode;
  pendingPayments: PendingPaymentRow[];
}) {
  const searchParams = useSearchParams();
  const reviewId = searchParams.get("review") ? Number(searchParams.get("review")) : null;
  const reviewedRow = reviewId ? pendingPayments.find((p) => p.id === reviewId) ?? null : null;

  const [tab, setTab] = useState<"overview" | "pending">(reviewedRow ? "pending" : "overview");
  const [modalDismissed, setModalDismissed] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab("overview")}
          className={`min-h-11 border-b-2 px-3 text-sm font-semibold ${
            tab === "overview" ? "border-amber-600 text-amber-700" : "border-transparent text-slate-500"
          }`}
        >
          ภาพรวมหนี้สิน
        </button>
        <button
          type="button"
          onClick={() => setTab("pending")}
          className={`inline-flex min-h-11 items-center gap-1.5 border-b-2 px-3 text-sm font-semibold ${
            tab === "pending" ? "border-amber-600 text-amber-700" : "border-transparent text-slate-500"
          }`}
        >
          รายการรอตรวจสอบ
          {pendingPayments.length > 0 && (
            <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {pendingPayments.length}
            </span>
          )}
        </button>
      </div>

      {tab === "overview" ? (
        overview
      ) : (
        <div className="flex flex-col gap-3">
          {pendingPayments.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              ไม่มีรายการแจ้งชำระเงินที่รอตรวจสอบ
            </p>
          ) : (
            pendingPayments.map((row) => <PendingPaymentCard key={row.id} row={row} />)
          )}
        </div>
      )}

      {reviewedRow && !modalDismissed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setModalDismissed(true)}
                className="inline-flex min-h-9 items-center rounded-full bg-white px-3 text-xs font-semibold text-slate-600 shadow"
              >
                ปิด
              </button>
            </div>
            <PendingPaymentCard row={reviewedRow} />
          </div>
        </div>
      )}
    </div>
  );
}
