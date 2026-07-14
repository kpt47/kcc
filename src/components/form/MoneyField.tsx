import { forwardRef, InputHTMLAttributes } from "react";
import { FieldWrapper } from "./FieldWrapper";
import { inputClassName } from "./inputStyles";
import { thaiBahtText } from "@/lib/thai";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  /** ค่าปัจจุบันของช่องนี้ (จาก watch()) ใช้แสดงคำอ่านจำนวนเงินเป็นตัวหนังสือ */
  amountValue?: number;
};

export const MoneyField = forwardRef<HTMLInputElement, Props>(function MoneyField(
  { label, error, hint, required, className, id, name, amountValue, ...rest },
  ref
) {
  const inputId = id ?? name;
  const bahtText = typeof amountValue === "number" && amountValue > 0 ? thaiBahtText(amountValue) : undefined;
  return (
    <FieldWrapper label={label} htmlFor={inputId} required={required} error={error} hint={hint}>
      <input
        ref={ref}
        id={inputId}
        name={name}
        type="number"
        inputMode="decimal"
        step="0.01"
        min={0}
        className={inputClassName(!!error, className)}
        {...rest}
      />
      {bahtText && (
        <p className="rounded-md bg-emerald-50 px-2.5 py-1.5 text-sm text-emerald-700">
          ({bahtText})
        </p>
      )}
    </FieldWrapper>
  );
});
