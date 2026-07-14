"use client";

export function SortableHeader({
  label,
  field,
  sortField,
  sortDir,
  onSort,
}: {
  label: string;
  field: string;
  sortField: string;
  sortDir: "asc" | "desc";
  onSort: (field: string) => void;
}) {
  return (
    <th className="whitespace-nowrap px-3 py-2">
      <button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-1 hover:text-emerald-700">
        {label}
        {sortField === field && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}
