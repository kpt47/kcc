"use client";

import { useState } from "react";
import { FieldWrapper } from "./FieldWrapper";
import { inputClassName } from "./inputStyles";
import { THAI_MONTHS, currentBeYear, isoToThaiParts, thaiPartsToIso } from "@/lib/thai";

function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i <= end; i++) result.push(i);
  return result;
}

export function ThaiDateField({
  label,
  required,
  error,
  hint,
  value,
  onChange,
  fromBeYearOffset = 0,
  toBeYearOffset = 10,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  value?: string;
  onChange: (isoDate: string | undefined) => void;
  /** ปีเริ่มต้นของตัวเลือก คิดจากปีปัจจุบัน (พ.ศ.) + offset นี้ — ค่าเริ่มต้น 0 = ปีปัจจุบัน (ใช้กับวันที่ทำรายการ/
   * เอกสารทั่วไปที่ควรเป็นปัจจุบันหรืออนาคตอันใกล้ ไม่ใช่วันเกิด — วันเกิดต้องส่ง offset ติดลบมากเอง เช่น -100) */
  fromBeYearOffset?: number;
  /** ปีสุดท้ายของตัวเลือก คิดจากปีปัจจุบัน (พ.ศ.) + offset นี้ — ค่าเริ่มต้น 10 = ปีปัจจุบัน + 10 ปี */
  toBeYearOffset?: number;
}) {
  const nowBe = currentBeYear();
  const years = range(nowBe + fromBeYearOffset, nowBe + toBeYearOffset).reverse();
  const selectClass = inputClassName(!!error);

  const [draft, setDraft] = useState<{ day?: number; month?: number; beYear?: number }>(
    () => isoToThaiParts(value) ?? {}
  );

  // ซิงก์ค่าจากภายนอก (เช่น ตอนย้อนกลับ step หรือรีเซ็ตฟอร์ม) เข้ามาเป็นค่าเริ่มต้นของ draft
  // ปรับ state ระหว่าง render แทนการใช้ effect ตามแนวทางของ React (หลีกเลี่ยง render ซ้ำโดยไม่จำเป็น)
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(isoToThaiParts(value) ?? {});
  }

  function update(day?: number, month?: number, beYear?: number) {
    setDraft({ day, month, beYear });
    if (day && month && beYear) {
      onChange(thaiPartsToIso(day, month, beYear));
    } else {
      onChange(undefined);
    }
  }

  return (
    <FieldWrapper label={label} required={required} error={error} hint={hint}>
      <div className="grid grid-cols-3 gap-2">
        <select
          aria-label="วัน"
          className={selectClass}
          value={draft.day ?? ""}
          onChange={(e) => update(e.target.value ? Number(e.target.value) : undefined, draft.month, draft.beYear)}
        >
          <option value="">วัน</option>
          {range(1, 31).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          aria-label="เดือน"
          className={selectClass}
          value={draft.month ?? ""}
          onChange={(e) => update(draft.day, e.target.value ? Number(e.target.value) : undefined, draft.beYear)}
        >
          <option value="">เดือน</option>
          {THAI_MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          aria-label="ปี พ.ศ."
          className={selectClass}
          value={draft.beYear ?? ""}
          onChange={(e) => update(draft.day, draft.month, e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">ปี พ.ศ.</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </FieldWrapper>
  );
}
