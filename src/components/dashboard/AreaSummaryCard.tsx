"use client";

import { useEffect, useState } from "react";
import { exportRowsAsExcel } from "@/lib/export";
import { SortableHeader } from "@/components/official-reports/SortableHeader";

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

type Option = { id: number; name: string };

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
  const [provinces, setProvinces] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [subDistricts, setSubDistricts] = useState<Option[]>([]);
  const [villages, setVillages] = useState<Option[]>([]);

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

  // โหลดรายชื่อจังหวัดทั้งหมดครั้งเดียวตอนเปิดหน้า
  useEffect(() => {
    fetch("/api/master-data/provinces")
      .then((r) => r.json())
      .then((data: Option[]) => setProvinces(data.map((p) => ({ id: p.id, name: p.name }))));
  }, []);

  // เลือกจังหวัดแล้ว -> โหลดอำเภอในจังหวัดนั้น (และล้างตัวเลือกที่ลึกกว่าทั้งหมด)
  useEffect(() => {
    setDistrictId("");
    setSubDistrictId("");
    setVillageId("");
    setSubDistricts([]);
    setVillages([]);
    if (!provinceId) {
      setDistricts([]);
      return;
    }
    fetch(`/api/master-data/districts?provinceId=${provinceId}`)
      .then((r) => r.json())
      .then((data: Option[]) => setDistricts(data.map((d) => ({ id: d.id, name: d.name }))));
  }, [provinceId]);

  // เลือกอำเภอแล้ว -> โหลดตำบลในอำเภอนั้น
  useEffect(() => {
    setSubDistrictId("");
    setVillageId("");
    setVillages([]);
    if (!districtId) {
      setSubDistricts([]);
      return;
    }
    fetch(`/api/master-data/sub-districts?districtId=${districtId}`)
      .then((r) => r.json())
      .then((data: Option[]) => setSubDistricts(data.map((s) => ({ id: s.id, name: s.name }))));
  }, [districtId]);

  // เลือกตำบลแล้ว -> โหลดหมู่บ้านในตำบลนั้น
  useEffect(() => {
    setVillageId("");
    if (!subDistrictId) {
      setVillages([]);
      return;
    }
    fetch(`/api/master-data/villages?subDistrictId=${subDistrictId}`)
      .then((r) => r.json())
      .then((data: { id: number; villageNo: string; villageName: string }[]) =>
        setVillages(data.map((v) => ({ id: v.id, name: `หมู่ ${v.villageNo} บ้าน${v.villageName}` })))
      );
  }, [subDistrictId]);

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

  function handleExportExcel() {
    exportRowsAsExcel(
      rows.map((r) => ({
        พื้นที่: r.areaName,
        ครัวเรือนทั้งหมด: r.totalHouseholds,
        ครัวเรือนเป้าหมาย: r.targetHouseholds,
        ได้รับเงินยืม: r.householdsWithLoan,
        ยอดเงินคงค้าง: r.outstandingBalance,
        เงินในบัญชีธนาคาร: r.bankBalance,
        เงินในมือ: r.cashOnHand,
        รวมเงินที่มี: r.totalFund,
        ได้รับคืนรอบปี: r.repaidThisYear,
      })),
      `dashboard-area-summary-${level}`
    );
  }

  const areaLabel = LEVEL_LABELS[level];

  return (
    <div className="motion-safe:animate-fadeInUp flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">สรุปภาวะหนี้สินราย{areaLabel}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">เลือกจังหวัด → อำเภอ → ตำบล → หมู่บ้านตามลำดับ แล้วคลิกหัวคอลัมน์เพื่อจัดเรียง</p>
        </div>
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={rows.length === 0}
          className="inline-flex min-h-9 items-center rounded-lg border border-emerald-300 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
        >
          Export Excel (.xlsx)
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">จังหวัด</label>
          <select
            value={provinceId}
            onChange={(e) => setProvinceId(e.target.value)}
            className="min-h-10 w-40 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">-- ทั้งหมด --</option>
            {provinces.map((p) => (
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
            onChange={(e) => setDistrictId(e.target.value)}
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
            onChange={(e) => setSubDistrictId(e.target.value)}
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
                {v.name}
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

      <div className="overflow-x-auto">
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
