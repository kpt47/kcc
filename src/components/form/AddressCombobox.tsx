"use client";

import { useMemo, useState } from "react";
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from "@headlessui/react";
import { ChevronsUpDown, Plus } from "lucide-react";
import clsx from "clsx";
import type { GlobalRole } from "@/generated/prisma/client";

export type AddressOption = { id: number; name: string };

/**
 * Dropdown ค้นหาที่อยู่แบบพิมพ์กรอง (Type-to-Search) พร้อมปุ่ม "+ เพิ่มข้อมูล..." สำหรับสร้างรายการใหม่ทันที
 * ใช้ร่วมกันได้ทั้งหน้า Master Data (จังหวัด/อำเภอ/ตำบล/หมู่บ้าน) และฟอร์มสร้างผู้ใช้งานใหม่ (พื้นที่รับผิดชอบ)
 *
 * สิทธิ์ "เพิ่มข้อมูลใหม่" ตรวจสอบจาก currentUser.role ภายในคอมโพเนนต์นี้เอง (ไม่ใช่แค่จาก onCreate ที่ส่งเข้ามา)
 * เฉพาะ GLOBAL_ADMIN เท่านั้นที่เห็นปุ่ม "+ เพิ่มข้อมูล..." — role อื่นเห็นแค่ข้อความ "ไม่พบข้อมูล" เมื่อค้นหาไม่เจอ
 * ตามระเบียบที่กำหนดไว้อย่างชัดเจน (ป้องกันไม่ให้ผู้เรียกใช้ลืมเช็คสิทธิ์เอง)
 */
export function AddressCombobox({
  label,
  options,
  value,
  onChange,
  currentUser,
  onCreate,
  disabled,
  lockedLabel,
  placeholder,
  required,
  error,
}: {
  label: string;
  options: AddressOption[];
  value: number | null | undefined;
  onChange: (option: AddressOption | undefined) => void;
  currentUser: Pick<{ role: GlobalRole }, "role">;
  onCreate?: (name: string) => Promise<AddressOption | null>;
  disabled?: boolean;
  lockedLabel?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const canCreate = currentUser.role === "GLOBAL_ADMIN" && !!onCreate;
  const selected = useMemo(() => options.find((o) => o.id === value) ?? null, [options, value]);

  const filtered =
    query === "" ? options : options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()));

  async function handleCreate() {
    if (!onCreate || !query.trim()) return;
    setCreating(true);
    const created = await onCreate(query.trim());
    setCreating(false);
    if (created) {
      onChange(created);
      setQuery("");
    }
  }

  if (lockedLabel !== undefined) {
    return (
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</label>
        <div className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {lockedLabel || "-"}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
        {required && <span className="ml-0.5 text-rose-600 dark:text-rose-400">*</span>}
      </label>
      <Combobox
        value={selected}
        onChange={(o: AddressOption | null) => onChange(o ?? undefined)}
        onClose={() => setQuery("")}
        disabled={disabled}
      >
        <div className="relative">
          <ComboboxInput
            className={clsx(
              "min-h-11 w-full rounded-lg border px-3 pr-9 text-sm text-slate-900 dark:text-slate-100",
              "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800",
              error ? "border-rose-400 bg-rose-50 dark:border-rose-600 dark:bg-rose-950/40" : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"
            )}
            displayValue={(o: AddressOption | null) => o?.name ?? ""}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder ?? `-- ค้นหา${label} --`}
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
            <ChevronsUpDown size={16} />
          </ComboboxButton>

          <ComboboxOptions
            anchor="bottom start"
            className="z-50 mt-1 max-h-60 w-[var(--input-width)] overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800"
          >
            {filtered.length === 0 ? (
              query.trim() === "" ? (
                <p className="px-3 py-2 text-slate-400 dark:text-slate-500">พิมพ์เพื่อค้นหา...</p>
              ) : canCreate ? (
                <button
                  type="button"
                  disabled={creating}
                  onClick={handleCreate}
                  className="flex w-full items-center gap-1.5 px-3 py-2 text-left font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                >
                  <Plus size={14} />
                  {creating ? "กำลังเพิ่ม..." : `เพิ่มข้อมูล "${query.trim()}"`}
                </button>
              ) : (
                <p className="px-3 py-2 text-slate-400 dark:text-slate-500">ไม่พบข้อมูล</p>
              )
            ) : (
              filtered.map((o) => (
                <ComboboxOption
                  key={o.id}
                  value={o}
                  className="cursor-pointer px-3 py-2 data-[focus]:bg-sky-50 data-[selected]:font-semibold dark:data-[focus]:bg-sky-950/40"
                >
                  {o.name}
                </ComboboxOption>
              ))
            )}
          </ComboboxOptions>
        </div>
      </Combobox>
      {error && <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
