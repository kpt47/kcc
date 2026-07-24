"use client";

import { useMemo, useState, type ReactNode } from "react";

// หมายเหตุสำคัญ: ห้ามส่ง function เป็น prop จาก Server Component เข้ามาที่นี่ (เหมือน EntityListView/DataTableCard)
// ผู้เรียกใช้ต้องเตรียม searchText/sortValues/node ให้เสร็จก่อน (คำนวณฝั่ง Server Component)
export type SearchSortItem = {
  key: string | number;
  searchText: string; // ข้อความรวมทุกฟิลด์ที่ต้องการให้ค้นหาเจอ (ผู้เรียกใช้ทำ .toLowerCase() มาให้แล้ว)
  sortValues: Record<string, string | number>;
  node: ReactNode;
};

export type SortFieldOption = { value: string; label: string };

/**
 * กล่องค้นหา + ตัวเลือกจัดเรียง ใช้ครอบรายการการ์ดที่มีเนื้อหา/ปุ่มกดซับซ้อน (เตรียมเป็น ReactNode มาแล้ว)
 * ต่างจาก EntityListView ตรงที่ไม่มีมุมมองตาราง — ใช้กับหน้าที่แต่ละรายการเป็นการ์ดเดียวเสมอ (เช่น บัญชีคุมเงินฝาก)
 */
export function SearchSortList({
  items,
  sortFields,
  defaultSortField,
  defaultSortDir = "asc",
  searchPlaceholder = "ค้นหา...",
  emptyMessage = "ไม่พบรายการที่ตรงกับการค้นหานี้",
}: {
  items: SearchSortItem[];
  sortFields: SortFieldOption[];
  defaultSortField: string;
  defaultSortDir?: "asc" | "desc";
  searchPlaceholder?: string;
  emptyMessage?: string;
}) {
  const [q, setQ] = useState("");
  const [sortField, setSortField] = useState(defaultSortField);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);

  const sorted = useMemo(() => {
    const query = q.trim().toLowerCase();
    const filtered = query ? items.filter((i) => i.searchText.includes(query)) : items;
    return [...filtered].sort((a, b) => {
      const av = a.sortValues[sortField];
      const bv = b.sortValues[sortField];
      const dir = sortDir === "asc" ? 1 : -1;
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv, "th") * dir;
      return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
    });
  }, [items, q, sortField, sortDir]);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={searchPlaceholder}
        className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
      />

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold text-slate-500">เรียงตาม:</label>
        <select
          value={sortField}
          onChange={(e) => setSortField(e.target.value)}
          className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          {sortFields.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
        >
          {sortDir === "asc" ? "น้อย → มาก ↑" : "มาก → น้อย ↓"}
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((i) => (
            <div key={i.key}>{i.node}</div>
          ))}
        </div>
      )}
    </div>
  );
}
