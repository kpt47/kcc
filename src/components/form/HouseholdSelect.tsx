"use client";

import { useEffect, useState } from "react";
import { FieldWrapper } from "./FieldWrapper";
import { inputClassName } from "./inputStyles";

export type HouseholdOption = {
  id: number;
  sequenceNo: number;
  headFirstName: string;
  headLastName: string;
  houseNo: string | null;
  birthDate: string | null;
  occupation: string | null;
  consentPersonName: string | null;
  consentRelation: string | null;
  village: {
    villageName: string;
    villageNo: string;
    subDistrict: { name: string; district: { name: string; province: { name: string } } };
  };
};

export function HouseholdSelect({
  label,
  required,
  error,
  value,
  onChange,
  onSelectHousehold,
}: {
  label: string;
  required?: boolean;
  error?: string;
  value?: number;
  onChange: (id: number | undefined) => void;
  onSelectHousehold?: (household: HouseholdOption | undefined) => void;
}) {
  const [households, setHouseholds] = useState<HouseholdOption[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/households")
      .then((res) => {
        if (!res.ok) throw new Error("load failed");
        return res.json();
      })
      .then((data: HouseholdOption[]) => {
        if (!cancelled) {
          setHouseholds(data);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const disabled = status !== "ready" || households.length === 0;
  const hint =
    status === "loading"
      ? "กำลังโหลดรายชื่อครัวเรือน..."
      : status === "ready" && households.length === 0
        ? "ยังไม่มีครัวเรือนเป้าหมายในระบบ กรุณาลงทะเบียนครัวเรือนก่อน"
        : undefined;

  return (
    <FieldWrapper label={label} required={required} error={error} hint={hint}>
      <select
        className={inputClassName(!!error)}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => {
          const id = e.target.value ? Number(e.target.value) : undefined;
          onChange(id);
          onSelectHousehold?.(households.find((h) => h.id === id));
        }}
      >
        <option value="">-- เลือกครัวเรือนเป้าหมาย --</option>
        {households.map((h) => (
          <option key={h.id} value={h.id}>
            ลำดับที่ {h.sequenceNo} - {h.headFirstName} {h.headLastName} (หมู่ {h.village.villageNo}{" "}
            {h.village.villageName})
          </option>
        ))}
      </select>
      {status === "error" && <p className="text-xs text-rose-600">โหลดรายชื่อครัวเรือนไม่สำเร็จ กรุณาลองใหม่</p>}
    </FieldWrapper>
  );
}
