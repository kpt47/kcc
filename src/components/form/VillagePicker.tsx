"use client";

import { useEffect, useState } from "react";
import { FieldWrapper } from "./FieldWrapper";
import { inputClassName } from "./inputStyles";

type VillageOption = {
  id: number;
  villageNo: string;
  villageName: string;
  subDistrict: { name: string; district: { name: string; province: { name: string } } };
};

// เลือกหมู่บ้านจากรายชื่อที่มีอยู่แล้วในระบบเท่านั้น (Read-only list) — ไม่มีฟอร์ม "เพิ่มหมู่บ้านใหม่" แบบ
// self-service อีกต่อไป เพราะการเพิ่ม/แก้ไขรายชื่อหมู่บ้าน (Master Data) เป็นสิทธิ์ของ GLOBAL_ADMIN
// (ส่วนกลาง) เท่านั้น ตามระเบียบ — หากไม่พบหมู่บ้านที่ต้องการ ให้ติดต่อผู้ดูแลระบบส่วนกลางผ่านหน้า
// "จัดการพื้นที่ (Master Data)" แทน (ดู POST /api/villages ซึ่งบังคับ GLOBAL_ADMIN เท่านั้นแล้ว)
export function VillagePicker({
  label,
  required,
  error,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  error?: string;
  value?: number;
  onChange: (id: number | undefined) => void;
}) {
  const [villages, setVillages] = useState<VillageOption[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetch("/api/villages")
      .then((res) => {
        if (!res.ok) throw new Error("load failed");
        return res.json();
      })
      .then((data: VillageOption[]) => {
        setVillages(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <FieldWrapper
        label={label}
        required={required}
        error={error}
        hint={status === "loading" ? "กำลังโหลดรายชื่อหมู่บ้าน..." : undefined}
      >
        <select
          className={inputClassName(!!error)}
          value={value ?? ""}
          disabled={status !== "ready"}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">-- เลือกหมู่บ้าน --</option>
          {villages.map((v) => (
            <option key={v.id} value={v.id}>
              บ้าน{v.villageName} หมู่ {v.villageNo} ต.{v.subDistrict.name} อ.{v.subDistrict.district.name} จ.
              {v.subDistrict.district.province.name}
            </option>
          ))}
        </select>
      </FieldWrapper>

      {status === "ready" && villages.length === 0 && (
        <p className="text-xs text-slate-500">
          ยังไม่มีหมู่บ้านในระบบ — การเพิ่มรายชื่อหมู่บ้านใหม่เป็นสิทธิ์ของผู้ดูแลระบบส่วนกลาง (กรมการพัฒนาชุมชน) เท่านั้น
          กรุณาติดต่อผู้ดูแลระบบส่วนกลางเพื่อเพิ่มหมู่บ้านผ่านหน้า &quot;จัดการพื้นที่ (Master Data)&quot;
        </p>
      )}
    </div>
  );
}
