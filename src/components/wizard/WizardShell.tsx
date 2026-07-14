"use client";

import { ReactNode } from "react";
import clsx from "clsx";

export type WizardStepMeta = {
  title: string;
};

export function WizardShell({
  steps,
  currentStep,
  onBack,
  onNext,
  onSubmit,
  isSubmitting,
  submitLabel = "บันทึกข้อมูล",
  children,
}: {
  steps: WizardStepMeta[];
  currentStep: number;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  children: ReactNode;
}) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="flex flex-col gap-6 pb-28">
      {/* ตัวบ่งชี้ขั้นตอน */}
      <ol className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {steps.map((step, index) => {
          const active = index === currentStep;
          const done = index < currentStep;
          return (
            <li key={step.title} className="flex flex-1 min-w-[84px] flex-col items-center gap-1.5">
              <div
                className={clsx(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition",
                  done && "bg-emerald-600 text-white",
                  active && !done && "bg-emerald-600 text-white ring-4 ring-emerald-100",
                  !active && !done && "bg-slate-200 text-slate-500"
                )}
              >
                {done ? "✓" : index + 1}
              </div>
              <span
                className={clsx(
                  "text-center text-xs font-medium leading-tight",
                  active ? "text-emerald-700" : "text-slate-500"
                )}
              >
                {step.title}
              </span>
            </li>
          );
        })}
      </ol>

      {/* เนื้อหาขั้นตอนปัจจุบัน */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">{children}</div>

      {/* แถบปุ่มควบคุม (ติดด้านล่างจอบนมือถือ) */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            disabled={isFirstStep || isSubmitting}
            className="min-h-12 flex-1 rounded-lg border border-slate-300 bg-white px-4 text-base font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:px-6"
          >
            ย้อนกลับ
          </button>
          {isLastStep ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="min-h-12 flex-1 rounded-lg bg-emerald-600 px-4 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "กำลังบันทึก..." : submitLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className="min-h-12 flex-1 rounded-lg bg-emerald-600 px-4 text-base font-semibold text-white transition hover:bg-emerald-700"
            >
              ถัดไป
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
