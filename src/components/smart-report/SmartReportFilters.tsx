"use client";

import type { RiskStatusValue, ScopedAreaOptions, SmartFilters } from "./types";

const RISK_OPTIONS: { value: RiskStatusValue; emoji: string; label: string }[] = [
  { value: "NORMAL", emoji: "🟢", label: "ปกติ" },
  { value: "WATCHLIST", emoji: "🟡", label: "เฝ้าระวัง" },
  { value: "HIGH_RISK", emoji: "🔴", label: "เสี่ยงสูง" },
];

const MAX_INCOME_BOUND = 200_000;

export function SmartReportFilters({
  filters,
  onChange,
  areaOptions,
}: {
  filters: SmartFilters;
  onChange: (next: Partial<SmartFilters>) => void;
  areaOptions: ScopedAreaOptions | null;
}) {
  const districts = areaOptions?.districts.filter((d) => !filters.provinceId || d.provinceId === Number(filters.provinceId)) ?? [];
  const subDistricts =
    areaOptions?.subDistricts.filter((s) => !filters.districtId || s.districtId === Number(filters.districtId)) ?? [];
  const villages =
    areaOptions?.villages.filter((v) => !filters.subDistrictId || v.subDistrictId === Number(filters.subDistrictId)) ?? [];

  function toggleRisk(value: RiskStatusValue) {
    const next = filters.riskStatuses.includes(value)
      ? filters.riskStatuses.filter((r) => r !== value)
      : [...filters.riskStatuses, value];
    onChange({ riskStatuses: next, page: 1 });
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <input
        type="text"
        value={filters.q}
        onChange={(e) => onChange({ q: e.target.value, page: 1 })}
        placeholder="ค้นหาชื่อลูกบ้าน, ชื่อหมู่บ้าน, หรือเลขที่เอกสาร..."
        className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select
          value={filters.provinceId}
          onChange={(e) => onChange({ provinceId: e.target.value, districtId: "", subDistrictId: "", villageId: "", page: 1 })}
          className="min-h-10 rounded-lg border border-slate-300 px-2 text-sm"
        >
          <option value="">-- จังหวัด --</option>
          {areaOptions?.provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={filters.districtId}
          onChange={(e) => onChange({ districtId: e.target.value, subDistrictId: "", villageId: "", page: 1 })}
          disabled={!areaOptions}
          className="min-h-10 rounded-lg border border-slate-300 px-2 text-sm"
        >
          <option value="">-- อำเภอ --</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={filters.subDistrictId}
          onChange={(e) => onChange({ subDistrictId: e.target.value, villageId: "", page: 1 })}
          disabled={!areaOptions}
          className="min-h-10 rounded-lg border border-slate-300 px-2 text-sm"
        >
          <option value="">-- ตำบล --</option>
          {subDistricts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={filters.villageId}
          onChange={(e) => onChange({ villageId: e.target.value, page: 1 })}
          disabled={!areaOptions}
          className="min-h-10 rounded-lg border border-slate-300 px-2 text-sm"
        >
          <option value="">-- หมู่บ้าน --</option>
          {villages.map((v) => (
            <option key={v.id} value={v.id}>
              หมู่ {v.villageNo} บ้าน{v.villageName}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <span className="text-xs font-semibold text-slate-500">สถานะเครดิต:</span>
        {RISK_OPTIONS.map((opt) => (
          <label key={opt.value} className="flex items-center gap-1.5 text-sm text-slate-700">
            <input type="checkbox" checked={filters.riskStatuses.includes(opt.value)} onChange={() => toggleRisk(opt.value)} />
            {opt.emoji} {opt.label}
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-slate-500">
          ช่วงรายได้ จปฐ. ก่อนยืม: {filters.minIncome || 0} – {filters.maxIncome || MAX_INCOME_BOUND} บาท/คน/ปี
        </span>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={MAX_INCOME_BOUND}
            step={1000}
            value={filters.minIncome || 0}
            onChange={(e) => onChange({ minIncome: e.target.value, page: 1 })}
            className="flex-1"
          />
          <input
            type="range"
            min={0}
            max={MAX_INCOME_BOUND}
            step={1000}
            value={filters.maxIncome || MAX_INCOME_BOUND}
            onChange={(e) => onChange({ maxIncome: e.target.value, page: 1 })}
            className="flex-1"
          />
        </div>
      </div>

      <input
        type="text"
        value={filters.occupation}
        onChange={(e) => onChange({ occupation: e.target.value, page: 1 })}
        placeholder="อาชีพ (เช่น เกษตรกร, ค้าขาย)"
        className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm sm:max-w-xs"
      />
    </div>
  );
}
