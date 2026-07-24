"use client";

import { useEffect, useRef, useState } from "react";
import { SortableHeader } from "@/components/official-reports/SortableHeader";
import { ExportMenu } from "./ExportMenu";
import type { ScopedAreaOptions } from "@/lib/search";

type AreaLevel = "village" | "subDistrict" | "district" | "province";

type AreaSummaryRow = {
  areaName: string;
  totalHouseholds: number;
  targetHouseholds: number;
  householdsWithLoan: number;
  outstandingBalance: number;
  bankBalance: number;
  cashOnHand: number;
  totalFund: number;
  repaidThisYear: number;
};

const LEVEL_LABELS: Record<AreaLevel, string> = {
  province: "จังหวัด",
  district: "อำเภอ",
  subDistrict: "ตำบล",
  village: "หมู่บ้าน",
};

/**
 * การ์ดสรุปภาวะหนี้สินพร้อม dropdown แบบต่อเนื่อง (cascading): เลือกจังหวัด -> กรองอำเภอในจังหวัดนั้น ->
 * เลือกอำเภอ -> กรองตำบลในอำเภอนั้น -> เลือกตำบล -> กรองหมู่บ้านในตำบลนั้น -> เลือกหมู่บ้านเจาะจงได้ในที่สุด
 * ตารางด้านล่างแสดงข้อมูล "ลูก" ของระดับที่เลือกลึกที่สุดเสมอ (ระดับคำนวณโดยฝั่งเซิร์ฟเวอร์ ดู resolveDrillLevel)
 */
export function AreaSummaryCard() {
  // ตัวเลือกพื้นที่ทั้ง 4 ระดับ โหลดครั้งเดียวจาก /api/search/areas ซึ่งกรองตามขอบเขตสิทธิ์ของผู้ใช้ไว้แล้ว
  // (ก่อนหน้านี้ดึงจาก /api/master-data/* ซึ่งไม่กรองสิทธิ์ ทำให้เห็นชื่อจังหวัด/อำเภอ/ตำบล/หมู่บ้านนอกเขตได้)
  const [areaOptions, setAreaOptions] = useState<ScopedAreaOptions | null>(null);

  const [provinceId, setProvinceId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [subDistrictId, setSubDistrictId] = useState("");
  const [villageId, setVillageId] = useState("");

  const [q, setQ] = useState("");
  const [sortField, setSortField] = useState("areaName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [level, setLevel] = useState<AreaLevel>("province");
  const [rows, setRows] = useState<AreaSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const captureRef = useRef<HTMLDivElement>(null);

  // โหลดตัวเลือกพื้นที่ทั้งหมด (เฉพาะในขอบเขตสิทธิ์ของผู้ใช้) ครั้งเดียวตอนเปิดหน้า
  useEffect(() => {
    fetch("/api/search/areas")
      .then((r) => r.json())
      .then((data: ScopedAreaOptions) => setAreaOptions(data));
  }, []);

  // กรองตัวเลือกแต่ละระดับตามที่เลือกไว้ในระดับสูงกว่า (ฝั่ง client ล้วนๆ — ข้อมูลตั้งต้นกรองสิทธิ์มาแล้ว)
  const districts = areaOptions?.districts.filter((d) => !provinceId || d.provinceId === Number(provinceId)) ?? [];
  const subDistricts = areaOptions?.subDistricts.filter((s) => !districtId || s.districtId === Number(districtId)) ?? [];
  const villages = areaOptions?.villages.filter((v) => !subDistrictId || v.subDistrictId === Number(subDistrictId)) ?? [];

  function handleProvinceChange(value: string) {
    setProvinceId(value);
    setDistrictId("");
    setSubDistrictId("");
    setVillageId("");
  }
  function handleDistrictChange(value: string) {
    setDistrictId(value);
    setSubDistrictId("");
    setVillageId("");
  }
  function handleSubDistrictChange(value: string) {
    setSubDistrictId(value);
    setVillageId("");
  }

  // ดึงข้อมูลสรุปตามตัวกรองที่ลึกที่สุดที่เลือกไว้ตอนนี้ (ระดับที่แสดงคำนวณโดยฝั่งเซิร์ฟเวอร์)
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (provinceId) params.set("provinceId", provinceId);
    if (districtId) params.set("districtId", districtId);
    if (subDistrictId) params.set("subDistrictId", subDistrictId);
    if (villageId) params.set("villageId", villageId);
    if (q) params.set("q", q);
    params.set("sortField", sortField);
    params.set("sortDir", sortDir);
    fetch(`/api/dashboard/area-summary?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setLevel(data.level ?? "province");
        setRows(data.rows ?? []);
        setLoading(false);
      });
  }, [provinceId, districtId, subDistrictId, villageId, q, sortField, sortDir]);

  function handleSort(field: string) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function excelRows() {
    return rows.map((r) => ({
      พื้นที่: r.areaName,
      ครัวเรือนทั้งหมด: r.totalHouseholds,
      ครัวเรือนเป้าหมาย: r.targetHouseholds,
      ได้รับเงินยืม: r.householdsWithLoan,
      ยอดเงินคงค้าง: r.outstandingBalance,
      เงินในบัญชีธนาคาร: r.bankBalance,
      เงินในมือ: r.cashOnHand,
      รวมเงินที่มี: r.totalFund,
      ได้รับคืนรอบปี: r.repaidThisYear,
    }));
  }

  const areaLabel = LEVEL_LABELS[level];

  return (
    <div className="motion-safe:animate-fadeInUp flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">สรุปภาวะหนี้สินราย{areaLabel}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">เลือกจังหวัด → อำเภอ → ตำบล → หมู่บ้านตามลำดับ แล้วคลิกหัวคอลัมน์เพื่อจัดเรียง</p>
        </div>
        <ExportMenu targetRef={captureRef} excelRows={excelRows} filename={`dashboard-area-summary-${level}`} />
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">จังหวัด</label>
          <select
            value={provinceId}
            onChange={(e) => handleProvinceChange(e.target.value)}
            className="min-h-10 w-40 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">-- ทั้งหมด --</option>
            {areaOptions?.provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">อำเภอ</label>
          <select
            value={districtId}
            onChange={(e) => handleDistrictChange(e.target.value)}
            disabled={!provinceId}
            className="min-h-10 w-40 rounded-lg border border-slate-300 bg-white px-2 text-sm disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-900 dark:disabled:text-slate-600"
          >
            <option value="">{provinceId ? "-- ทั้งหมด --" : "-- เลือกจังหวัดก่อน --"}</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">ตำบล</label>
          <select
            value={subDistrictId}
            onChange={(e) => handleSubDistrictChange(e.target.value)}
            disabled={!districtId}
            className="min-h-10 w-40 rounded-lg border border-slate-300 bg-white px-2 text-sm disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-900 dark:disabled:text-slate-600"
          >
            <option value="">{districtId ? "-- ทั้งหมด --" : "-- เลือกอำเภอก่อน --"}</option>
            {subDistricts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">หมู่บ้าน</label>
          <select
            value={villageId}
            onChange={(e) => setVillageId(e.target.value)}
            disabled={!subDistrictId}
            className="min-h-10 w-44 rounded-lg border border-slate-300 bg-white px-2 text-sm disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-900 dark:disabled:text-slate-600"
          >
            <option value="">{subDistrictId ? "-- ทั้งหมด --" : "-- เลือกตำบลก่อน --"}</option>
            {villages.map((v) => (
              <option key={v.id} value={v.id}>
                หมู่ {v.villageNo} บ้าน{v.villageName}
              </option>
            ))}
          </select>
        </div>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`ค้นหาชื่อ${areaLabel}...`}
          className="min-h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <div ref={captureRef} className="overflow-x-auto bg-white dark:bg-slate-900">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <SortableHeader label={areaLabel} field="areaName" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="ครัวเรือนทั้งหมด" field="totalHouseholds" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="ครัวเรือนเป้าหมาย" field="targetHouseholds" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="ได้รับเงินยืม" field="householdsWithLoan" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="ยอดเงินคงค้าง" field="outstandingBalance" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="เงินในบัญชีธนาคาร" field="bankBalance" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="เงินในมือ" field="cashOnHand" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="รวมเงินที่มี" field="totalFund" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="ได้รับคืนรอบปี" field="repaidThisYear" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                  ไม่พบข้อมูลตามเงื่อนไขที่กำหนด
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.areaName} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-300">{r.areaName}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-300">{r.totalHouseholds}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-300">{r.targetHouseholds}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-300">{r.householdsWithLoan}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-amber-800 dark:text-amber-400">{r.outstandingBalance.toLocaleString("th-TH")}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-300">{r.bankBalance.toLocaleString("th-TH")}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-300">{r.cashOnHand.toLocaleString("th-TH")}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-300">{r.totalFund.toLocaleString("th-TH")}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-300">{r.repaidThisYear.toLocaleString("th-TH")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
