"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmDialog } from "@/lib/confirmDialog";
import { AddressCombobox, type AddressOption } from "@/components/form/AddressCombobox";
import type { GlobalRole } from "@/generated/prisma/client";

export type VillageRow = {
  id: number;
  villageNo: string;
  villageName: string;
  budgetYear: number;
  budgetAmount: number | null;
  latitude: number | null;
  longitude: number | null;
  subDistrict: { id: number; name: string; district: { name: string; province: { name: string } } };
};

/**
 * ระดับการล็อกฟิลด์จังหวัด/อำเภอ/ตำบล ของฟอร์มขึ้นทะเบียนหมู่บ้านใหม่ — ค่า null ในแต่ละช่อง = ไม่ล็อก
 * (เลือกได้อิสระ), มีค่า = ล็อกไว้ที่ค่านั้น (แสดงเป็นข้อความอ่านอย่างเดียว ไม่ใช่ dropdown) คำนวณมาจาก
 * lib/authz.ts + master-data/page.tsx ตามสิทธิ์ของผู้ใช้ปัจจุบัน (ดูคอมเมนต์ resolveScopeLock ที่นั่น)
 */
export type VillageScopeLock = {
  province: AddressOption | null;
  district: AddressOption | null;
  subDistrict: AddressOption | null;
};

export function VillageManager({
  villages,
  subDistricts,
  canManage,
  canManageVillage,
  scopeLock,
  currentUser,
}: {
  villages: VillageRow[];
  subDistricts: { id: number; name: string }[];
  canManage: boolean;
  canManageVillage: boolean;
  scopeLock: VillageScopeLock;
  currentUser: Pick<{ role: GlobalRole }, "role">;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");
  const [newVillageNo, setNewVillageNo] = useState("");
  const [newVillageName, setNewVillageName] = useState("");
  const [newProvinceId, setNewProvinceId] = useState<number | undefined>(scopeLock.province?.id);
  const [newDistrictId, setNewDistrictId] = useState<number | undefined>(scopeLock.district?.id);
  const [newSubDistrictId, setNewSubDistrictId] = useState<number | undefined>(scopeLock.subDistrict?.id);
  const [newBudgetYear, setNewBudgetYear] = useState("");
  const [newLat, setNewLat] = useState("");
  const [newLng, setNewLng] = useState("");
  const [provinces, setProvinces] = useState<AddressOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<AddressOption[]>([]);
  const [subDistrictOptions, setSubDistrictOptions] = useState<AddressOption[]>(subDistricts);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ดึงรายชื่อจังหวัดทั้งหมดเฉพาะตอนฟิลด์จังหวัดไม่ถูกล็อก (ถ้าล็อกแล้วแสดงเป็นข้อความจาก scopeLock ตรงๆ
  // ไม่ต้องดึงรายการมาให้เลือกใหม่)
  useEffect(() => {
    if (!canManageVillage || scopeLock.province) return;
    fetch("/api/master-data/provinces")
      .then((r) => r.json())
      .then(setProvinces);
  }, [canManageVillage, scopeLock.province]);

  useEffect(() => {
    if (scopeLock.district) return; // อำเภอถูกล็อกอยู่แล้ว ไม่ต้องดึงตัวเลือกอำเภอมาคำนวณซ้ำ
    if (!newProvinceId) {
      setDistrictOptions([]);
      return;
    }
    fetch(`/api/master-data/districts?provinceId=${newProvinceId}`)
      .then((r) => r.json())
      .then((rows) => setDistrictOptions(rows.map((d: { id: number; name: string }) => ({ id: d.id, name: d.name }))));
  }, [newProvinceId, scopeLock.district]);

  useEffect(() => {
    if (scopeLock.subDistrict) return; // ตำบลถูกล็อกอยู่แล้ว ไม่ต้องดึงตัวเลือกตำบลมาคำนวณซ้ำ
    if (!newDistrictId) {
      setSubDistrictOptions(subDistricts);
      return;
    }
    fetch(`/api/master-data/sub-districts?districtId=${newDistrictId}`)
      .then((r) => r.json())
      .then((rows) => setSubDistrictOptions(rows.map((s: { id: number; name: string }) => ({ id: s.id, name: s.name }))));
  }, [newDistrictId, subDistricts, scopeLock.subDistrict]);

  async function createProvince(name: string): Promise<AddressOption | null> {
    const res = await fetch("/api/master-data/provinces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return null;
    const created = await res.json();
    setProvinces((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return { id: created.id, name: created.name };
  }

  async function createDistrict(name: string): Promise<AddressOption | null> {
    if (!newProvinceId) return null;
    const res = await fetch("/api/master-data/districts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, provinceId: newProvinceId }),
    });
    if (!res.ok) return null;
    const created = await res.json();
    setDistrictOptions((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return { id: created.id, name: created.name };
  }

  async function createSubDistrict(name: string): Promise<AddressOption | null> {
    if (!newDistrictId) return null;
    const res = await fetch("/api/master-data/sub-districts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, districtId: newDistrictId }),
    });
    if (!res.ok) return null;
    const created = await res.json();
    setSubDistrictOptions((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return { id: created.id, name: created.name };
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newSubDistrictId) {
      setError("กรุณาเลือกตำบล");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/master-data/villages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        villageNo: newVillageNo,
        villageName: newVillageName,
        subDistrictId: newSubDistrictId,
        budgetYear: Number(newBudgetYear),
        latitude: newLat ? Number(newLat) : undefined,
        longitude: newLng ? Number(newLng) : undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(
        body?.error?.formErrors?.[0] ??
          body?.error?.fieldErrors?.villageNo?.[0] ??
          body?.error?.fieldErrors?.villageName?.[0] ??
          body?.error?.fieldErrors?.subDistrictId?.[0] ??
          body?.error?.fieldErrors?.budgetYear?.[0] ??
          body?.error?.fieldErrors?.latitude?.[0] ??
          body?.error?.fieldErrors?.longitude?.[0] ??
          "บันทึกไม่สำเร็จ"
      );
      return;
    }
    setNewVillageNo("");
    setNewVillageName("");
    // รีเซ็ตเฉพาะฟิลด์ที่ไม่ถูกล็อก — ฟิลด์ที่ล็อกไว้ตามเขตของผู้ใช้ต้องคงค่าเดิมไว้เสมอ ไม่กลับเป็นค่าว่าง
    if (!scopeLock.province) setNewProvinceId(undefined);
    if (!scopeLock.district) setNewDistrictId(undefined);
    if (!scopeLock.subDistrict) setNewSubDistrictId(undefined);
    setNewBudgetYear("");
    setNewLat("");
    setNewLng("");
    router.refresh();
  }

  async function handleUpdate(id: number) {
    setSubmitting(true);
    const res = await fetch(`/api/master-data/villages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        villageName: editName,
        latitude: editLat ? Number(editLat) : null,
        longitude: editLng ? Number(editLng) : null,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setEditingId(null);
      router.refresh();
    }
  }

  async function handleDelete(id: number, name: string) {
    const confirmed = await confirmDialog({
      title: "ยืนยันการลบหมู่บ้าน",
      text: `คุณต้องการลบ "${name}" ใช่หรือไม่? การลบจะทำไม่ได้หากยังมีครัวเรือน/ผู้ใช้งาน/บัญชีเงินฝากผูกอยู่`,
      tone: "danger",
      confirmButtonText: "ยืนยันลบ",
    });
    if (!confirmed) return;
    const res = await fetch(`/api/master-data/villages/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      alert(body?.error?.formErrors?.[0] ?? "ลบไม่สำเร็จ");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {canManageVillage && (
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="w-56">
            <AddressCombobox
              label="จังหวัด"
              options={provinces}
              value={newProvinceId}
              onChange={(o) => {
                setNewProvinceId(o?.id);
                setNewDistrictId(undefined);
                setNewSubDistrictId(undefined);
              }}
              currentUser={currentUser}
              onCreate={createProvince}
              lockedLabel={scopeLock.province?.name}
              required
            />
          </div>
          <div className="w-56">
            <AddressCombobox
              label="อำเภอ"
              options={districtOptions}
              value={newDistrictId}
              onChange={(o) => {
                setNewDistrictId(o?.id);
                setNewSubDistrictId(undefined);
              }}
              currentUser={currentUser}
              onCreate={createDistrict}
              disabled={!newProvinceId}
              placeholder={!newProvinceId ? "-- เลือกจังหวัดก่อน --" : undefined}
              lockedLabel={scopeLock.district?.name}
              required
            />
          </div>
          <div className="w-56">
            <AddressCombobox
              label="ตำบล"
              options={subDistrictOptions}
              value={newSubDistrictId}
              onChange={(o) => setNewSubDistrictId(o?.id)}
              currentUser={currentUser}
              onCreate={createSubDistrict}
              disabled={!newDistrictId}
              placeholder={!newDistrictId ? "-- เลือกอำเภอก่อน --" : undefined}
              lockedLabel={scopeLock.subDistrict?.name}
              required
            />
          </div>
          <input
            type="text"
            value={newVillageNo}
            onChange={(e) => setNewVillageNo(e.target.value)}
            placeholder="หมู่ที่"
            required
            className="min-h-10 w-24 rounded-lg border border-slate-300 px-2 text-sm"
          />
          <input
            type="text"
            value={newVillageName}
            onChange={(e) => setNewVillageName(e.target.value)}
            placeholder="ชื่อหมู่บ้าน"
            required
            className="min-h-10 rounded-lg border border-slate-300 px-2 text-sm"
          />
          <input
            type="number"
            value={newBudgetYear}
            onChange={(e) => setNewBudgetYear(e.target.value)}
            placeholder="ปีงบประมาณ (พ.ศ.)"
            required
            className="min-h-10 w-36 rounded-lg border border-slate-300 px-2 text-sm"
          />
          <input
            type="number"
            step="any"
            value={newLat}
            onChange={(e) => setNewLat(e.target.value)}
            placeholder="ละติจูด (ถ้ามี)"
            className="min-h-10 w-32 rounded-lg border border-slate-300 px-2 text-sm"
          />
          <input
            type="number"
            step="any"
            value={newLng}
            onChange={(e) => setNewLng(e.target.value)}
            placeholder="ลองจิจูด (ถ้ามี)"
            className="min-h-10 w-32 rounded-lg border border-slate-300 px-2 text-sm"
          />
          <button type="submit" disabled={submitting} className="min-h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-60">
            + เพิ่มหมู่บ้าน
          </button>
          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        </form>
      )}

      <div className="flex flex-col gap-1.5">
        {villages.map((v) => (
          <div key={v.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            {editingId === v.id ? (
              <div className="flex flex-1 flex-wrap gap-1.5">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="min-h-8 flex-1 rounded-lg border border-slate-300 px-2 text-sm"
                />
                <input
                  type="number"
                  step="any"
                  value={editLat}
                  onChange={(e) => setEditLat(e.target.value)}
                  placeholder="ละติจูด"
                  className="min-h-8 w-28 rounded-lg border border-slate-300 px-2 text-sm"
                />
                <input
                  type="number"
                  step="any"
                  value={editLng}
                  onChange={(e) => setEditLng(e.target.value)}
                  placeholder="ลองจิจูด"
                  className="min-h-8 w-28 rounded-lg border border-slate-300 px-2 text-sm"
                />
              </div>
            ) : (
              <span>
                หมู่ {v.villageNo} บ้าน{v.villageName}{" "}
                <span className="text-xs text-slate-400">
                  (ต.{v.subDistrict.name} อ.{v.subDistrict.district.name} จ.{v.subDistrict.district.province.name} · งบ {v.budgetYear}
                  {v.latitude != null && v.longitude != null ? ` · พิกัด ${v.latitude.toFixed(4)}, ${v.longitude.toFixed(4)}` : " · ยังไม่ตั้งพิกัด"})
                </span>
              </span>
            )}
            {canManage && (
              <div className="flex shrink-0 gap-1.5">
                {editingId === v.id ? (
                  <>
                    <button type="button" onClick={() => handleUpdate(v.id)} disabled={submitting} className="min-h-8 rounded-full bg-emerald-600 px-2.5 text-xs font-semibold text-white">
                      บันทึก
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="min-h-8 rounded-full px-2.5 text-xs text-slate-500">
                      ยกเลิก
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(v.id);
                        setEditName(v.villageName);
                        setEditLat(v.latitude != null ? String(v.latitude) : "");
                        setEditLng(v.longitude != null ? String(v.longitude) : "");
                      }}
                      className="min-h-8 rounded-full border border-slate-300 px-2.5 text-xs font-semibold text-slate-600"
                    >
                      แก้ไข
                    </button>
                    <button type="button" onClick={() => handleDelete(v.id, v.villageName)} className="min-h-8 rounded-full border border-rose-300 px-2.5 text-xs font-semibold text-rose-700">
                      ลบ
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
