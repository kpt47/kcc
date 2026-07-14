"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ScopedAreaOptions } from "@/components/smart-report/types";

type ImportRow = {
  rowNumber: number;
  sequenceNo?: number | string | null;
  titlePrefix?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  username?: string | null;
  password?: string | null;
  age?: number | string | null;
  occupation?: string | null;
  consentPersonName?: string | null;
  consentRelation?: string | null;
  valid: boolean;
  errors: string[];
  matchedHouseholdId: number | null;
  matchedHouseholdName: string | null;
};

const EDITABLE_FIELDS: { key: keyof ImportRow; label: string }[] = [
  { key: "sequenceNo", label: "ลำดับที่ครัวเรือน" },
  { key: "titlePrefix", label: "คำนำหน้าชื่อ" },
  { key: "firstName", label: "ชื่อ" },
  { key: "lastName", label: "นามสกุล" },
  { key: "phoneNumber", label: "เบอร์โทรศัพท์" },
  { key: "username", label: "ชื่อผู้ใช้" },
  { key: "password", label: "รหัสผ่านเริ่มต้น" },
  { key: "age", label: "อายุ" },
  { key: "occupation", label: "อาชีพ" },
  { key: "consentPersonName", label: "ชื่อผู้ให้ความยินยอม" },
  { key: "consentRelation", label: "ความสัมพันธ์" },
];

export function ImportHouseholdsModal({ role, committeeRole }: { role: string; committeeRole: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [areaOptions, setAreaOptions] = useState<ScopedAreaOptions | null>(null);
  const [provinceId, setProvinceId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [subDistrictId, setSubDistrictId] = useState("");
  const [villageId, setVillageId] = useState("");
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ createdCount: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isChairman = role === "VILLAGE_COMMITTEE" && committeeRole === "CHAIRMAN";

  useEffect(() => {
    if (!open) return;
    fetch("/api/search/areas")
      .then((r) => r.json())
      .then((data: ScopedAreaOptions) => {
        setAreaOptions(data);
        // ล็อกค่าพื้นที่อัตโนมัติ — ผู้ที่เปิด modal นี้ได้ (CHAIRMAN/SUB_DISTRICT_ADMIN) มีขอบเขตแคบอยู่แล้ว
        // จังหวัด/อำเภอ/ตำบล จึงมีตัวเลือกเดียวเสมอ ส่วนหมู่บ้านมีเดียวเฉพาะ CHAIRMAN เท่านั้น
        if (data.provinces[0]) setProvinceId(String(data.provinces[0].id));
        if (data.districts[0]) setDistrictId(String(data.districts[0].id));
        if (data.subDistricts[0]) setSubDistrictId(String(data.subDistricts[0].id));
        if (isChairman && data.villages[0]) setVillageId(String(data.villages[0].id));
      });
  }, [open, isChairman]);

  const districts = areaOptions?.districts.filter((d) => d.provinceId === Number(provinceId)) ?? [];
  const subDistricts = areaOptions?.subDistricts.filter((s) => s.districtId === Number(districtId)) ?? [];
  const villages = areaOptions?.villages.filter((v) => v.subDistrictId === Number(subDistrictId)) ?? [];

  function resetAll() {
    setRows(null);
    setEditingRow(null);
    setError(null);
    setResult(null);
    if (!isChairman) setVillageId("");
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !villageId) return;
    setError(null);
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("villageId", villageId);
    const res = await fetch("/api/households/import/preview", { method: "POST", body: formData });
    setUploading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? "ตรวจสอบไฟล์ไม่สำเร็จ");
      return;
    }
    const data = await res.json();
    setRows(data.rows);
  }

  async function revalidate(nextRows: ImportRow[]) {
    setError(null);
    setUploading(true);
    const res = await fetch("/api/households/import/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ villageId, rows: nextRows }),
    });
    setUploading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? "ตรวจสอบไม่สำเร็จ");
      return;
    }
    const data = await res.json();
    setRows(data.rows);
  }

  function updateRowField(rowNumber: number, key: keyof ImportRow, value: string) {
    if (!rows) return;
    setRows(rows.map((r) => (r.rowNumber === rowNumber ? { ...r, [key]: value } : r)));
  }

  async function handleConfirm() {
    if (!rows) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/households/import/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ villageId, rows }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? "บันทึกไม่สำเร็จ");
      if (body?.rows) setRows(body.rows);
      return;
    }
    const data = await res.json();
    setResult(data);
    router.refresh();
  }

  const allValid = rows !== null && rows.length > 0 && rows.every((r) => r.valid);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center rounded-full border border-violet-300 px-3.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
      >
        นำเข้าข้อมูล (Import from Excel)
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">นำเข้าบัญชีผู้ใช้งานระดับครัวเรือน (Excel)</h2>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              resetAll();
            }}
            className="text-sm font-medium text-slate-500"
          >
            ปิด
          </button>
        </div>

        {result ? (
          <div className="mt-6 flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-2xl">✅</p>
            <p className="text-base font-bold text-slate-900">นำเข้าสำเร็จ {result.createdCount} บัญชี</p>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                resetAll();
              }}
              className="mt-2 inline-flex min-h-11 items-center rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <select value={provinceId} disabled className="min-h-10 rounded-lg border border-slate-300 bg-slate-100 px-2 text-sm">
                <option value={provinceId}>{areaOptions?.provinces[0]?.name ?? "..."}</option>
              </select>
              <select value={districtId} disabled className="min-h-10 rounded-lg border border-slate-300 bg-slate-100 px-2 text-sm">
                <option value={districtId}>{areaOptions?.districts.find((d) => String(d.id) === districtId)?.name ?? "..."}</option>
              </select>
              <select value={subDistrictId} disabled className="min-h-10 rounded-lg border border-slate-300 bg-slate-100 px-2 text-sm">
                <option value={subDistrictId}>
                  {areaOptions?.subDistricts.find((s) => String(s.id) === subDistrictId)?.name ?? "..."}
                </option>
              </select>
              <select
                value={villageId}
                onChange={(e) => setVillageId(e.target.value)}
                disabled={isChairman || !areaOptions}
                className={`min-h-10 rounded-lg border border-slate-300 px-2 text-sm ${isChairman ? "bg-slate-100" : ""}`}
              >
                {!isChairman && <option value="">-- เลือกหมู่บ้าน --</option>}
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    หมู่ {v.villageNo} บ้าน{v.villageName}
                  </option>
                ))}
              </select>
            </div>

            {villageId && !rows && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-slate-300 p-4">
                <a
                  href={`/api/households/template?villageId=${villageId}`}
                  className="inline-flex min-h-10 items-center rounded-full bg-violet-600 px-3.5 text-sm font-semibold text-white"
                >
                  ดาวน์โหลดไฟล์ต้นแบบ (Download Template)
                </a>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex min-h-10 items-center rounded-full border border-slate-300 px-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  {uploading ? "กำลังตรวจสอบ..." : "อัปโหลดไฟล์ที่กรอกแล้ว"}
                </button>
                <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
              </div>
            )}

            {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}

            {rows && (
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-slate-600">
                    ตรวจสอบแล้ว {rows.length} แถว — ผ่าน {rows.filter((r) => r.valid).length} แถว
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => revalidate(rows)}
                      disabled={uploading}
                      className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {uploading ? "กำลังตรวจสอบ..." : "ตรวจสอบอีกครั้ง"}
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      อัปโหลดไฟล์ใหม่
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full min-w-max text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                        <th className="px-2 py-2">สถานะ</th>
                        {EDITABLE_FIELDS.map((f) => (
                          <th key={f.key} className="whitespace-nowrap px-2 py-2">
                            {f.label}
                          </th>
                        ))}
                        <th className="whitespace-nowrap px-2 py-2">ข้อผิดพลาด</th>
                        <th className="px-2 py-2">แก้ไข</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.rowNumber} className={`border-b border-slate-100 last:border-0 ${r.valid ? "" : "bg-rose-50"}`}>
                          <td className="px-2 py-2 text-center">{r.valid ? "✅" : "❌"}</td>
                          {EDITABLE_FIELDS.map((f) => (
                            <td key={f.key} className="whitespace-nowrap px-2 py-2">
                              {editingRow === r.rowNumber ? (
                                <input
                                  defaultValue={r[f.key] != null ? String(r[f.key]) : ""}
                                  onBlur={(e) => updateRowField(r.rowNumber, f.key, e.target.value)}
                                  className="min-h-8 w-28 rounded border border-slate-300 px-1.5 text-xs"
                                />
                              ) : (
                                <span className="text-slate-700">{r[f.key] != null ? String(r[f.key]) : "-"}</span>
                              )}
                            </td>
                          ))}
                          <td className="max-w-[220px] px-2 py-2 text-xs text-rose-600">{r.errors.join("; ")}</td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => setEditingRow(editingRow === r.rowNumber ? null : r.rowNumber)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50"
                              aria-label="แก้ไข"
                            >
                              ✏️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {allValid && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={saving}
                  className="inline-flex min-h-11 items-center rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "กำลังบันทึก..." : "ยืนยันการบันทึก (Confirm & Save)"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
