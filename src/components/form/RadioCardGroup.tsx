"use client";

import clsx from "clsx";
import { FieldWrapper } from "./FieldWrapper";

export type RadioCardOption = {
  value: string;
  label: string;
  tone?: "positive" | "negative";
};

export function RadioCardGroup({
  label,
  required,
  error,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  options: RadioCardOption[];
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <FieldWrapper label={label} required={required} error={error} hint={hint}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((opt) => {
          const active = value === opt.value;
          const negative = opt.tone === "negative";
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              className={clsx(
                "min-h-12 rounded-lg border-2 px-4 py-2.5 text-left text-base font-medium transition",
                active
                  ? negative
                    ? "border-rose-500 bg-rose-50 text-rose-700"
                    : "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </FieldWrapper>
  );
}
