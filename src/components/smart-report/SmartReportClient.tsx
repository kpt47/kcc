"use client";

import { useEffect, useState } from "react";
import { SmartReportFilters } from "./SmartReportFilters";
import { SmartReportTable } from "./SmartReportTable";
import { SmartReportMap } from "./SmartReportMap";
import { DEFAULT_FILTERS, buildSearchParams, type ScopedAreaOptions, type SmartFilters, type SmartSearchRow } from "./types";

export function SmartReportClient() {
  const [tab, setTab] = useState<"table" | "map">("table");
  const [filters, setFilters] = useState<SmartFilters>(DEFAULT_FILTERS);
  const [areaOptions, setAreaOptions] = useState<ScopedAreaOptions | null>(null);
  const [rows, setRows] = useState<SmartSearchRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [drillDownVillageId, setDrillDownVillageId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/search/areas")
      .then((r) => r.json())
      .then(setAreaOptions);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = buildSearchParams(filters);
    params.set("page", String(filters.page));
    params.set("pageSize", String(filters.pageSize));
    params.set("sortField", filters.sortField);
    params.set("sortDir", filters.sortDir);
    fetch(`/api/search/households?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filters]);

  function handleFilterChange(next: Partial<SmartFilters>) {
    setFilters((prev) => ({ ...prev, ...next }));
    if (Object.keys(next).some((k) => k !== "page")) setDrillDownVillageId(null);
  }

  function handleDrillDown(villageId: number) {
    setFilters((prev) => ({ ...prev, villageId: String(villageId), page: 1 }));
    setDrillDownVillageId(villageId);
    setTab("table");
  }

  return (
    <div className="flex flex-col gap-4">
      <SmartReportFilters filters={filters} onChange={handleFilterChange} areaOptions={areaOptions} />

      <div className="flex gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab("table")}
          className={`min-h-11 border-b-2 px-3 text-sm font-semibold ${tab === "table" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500"}`}
        >
          ตาราง
        </button>
        <button
          type="button"
          onClick={() => setTab("map")}
          className={`min-h-11 border-b-2 px-3 text-sm font-semibold ${tab === "map" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500"}`}
        >
          มุมมองแผนที่ (Map View)
        </button>
      </div>

      {tab === "table" ? (
        <SmartReportTable rows={rows} total={total} filters={filters} onChange={handleFilterChange} loading={loading} onDrillDownVillage={drillDownVillageId} />
      ) : (
        <SmartReportMap onDrillDown={handleDrillDown} />
      )}
    </div>
  );
}
