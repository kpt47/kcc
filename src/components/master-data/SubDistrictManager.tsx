"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmDialog } from "@/lib/confirmDialog";
import { AddressCombobox, type AddressOption } from "@/components/form/AddressCombobox";
import type { GlobalRole } from "@/generated/prisma/client";

export type SubDistrictRow = {
  id: number;
  name: string;
  district: { id: number; name: string; province: { name: string } };
  _count: { villages: number };
};

export function SubDistrictManager({
  subDistricts,
  districts,
  canManage,
  currentUser,
}: {
  subDistricts: SubDistrictRow[];
  districts: { id: number; name: string }[];
  canManage: boolean;
  currentUser: Pick<{ role: GlobalRole }, "role">;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [newProvinceId, setNewProvinceId] = useState<number | undefined>();
  const [newDistrictId, setNewDistrictId] = useState<number | undefined>();
  const [provinces, setProvinces] = useState<AddressOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<AddressOption[]>(districts);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!canManage) return;
    fetch("/api/master-data/provinces")
      .then((r) => r.json())
      .then(setProvinces);
  }, [canManage]);

  useEffect(() => {
    if (!newProvinceId) {
      setDistrictOptions(districts);
      return;
    }
    fetch(`/api/master-data/districts?provinceId=${newProvinceId}`)
      .then((r) => r.json())
      .then((rows) => setDistrictOptions(rows.map((d: { id: number; name: string }) => ({ id: d.id, name: d.name }))));
  }, [newProvinceId, districts]);

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newDistrictId) {
      setError("กรุณาเลือกอำเภอ");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/master-data/sub-districts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, districtId: newDistrictId }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? body?.error?.fieldErrors?.name?.[0] ?? body?.error?.fieldErrors?.districtId?.[0] ?? "บันทึกไม่สำเร็จ");
      return;
    }
    setNewName("");
    setNewProvinceId(undefined);
    setNewDistrictId(undefined);
    router.refresh();
  }

  async function handleUpdate(id: number) {
    setSubmitting(true);
    const res = await fetch(`/api/master-data/sub-districts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    setSubmitting(false);
    if (res.ok) {
      setEditingId(null);
      router.refresh();
    }
  }

  async function handleDelete(id: number, name: string) {
    const confirmed = await confirmDialog({
      title: "ยืนยันการลบตำบล",
      text: `คุณต้องการลบ "${name}" ใช่หรือไม่? การลบจะทำไม่ได้หากยังมีหมู่บ้านผูกอยู่`,
      tone: "danger",
      confirmButtonText: "ยืนยันลบ",
    });
    if (!confirmed) return;
    const res = await fetch(`/api/master-data/sub-districts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      alert(body?.error?.formErrors?.[0] ?? "ลบไม่สำเร็จ");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {canManage && (
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="w-56">
            <AddressCombobox
              label="จังหวัด"
              options={provinces}
              value={newProvinceId}
              onChange={(o) => {
                setNewProvinceId(o?.id);
                setNewDistrictId(undefined);
              }}
              currentUser={currentUser}
              onCreate={createProvince}
              required
            />
          </div>
          <div className="w-56">
            <AddressCombobox
              label="อำเภอ"
              options={districtOptions}
              value={newDistrictId}
              onChange={(o) => setNewDistrictId(o?.id)}
              currentUser={currentUser}
              onCreate={createDistrict}
              disabled={!newProvinceId}
              placeholder={!newProvinceId ? "-- เลือกจังหวัดก่อน --" : undefined}
              required
            />
          </div>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="ชื่อตำบลใหม่"
            required
            className="min-h-10 rounded-lg border border-slate-300 px-2 text-sm"
          />
          <button type="submit" disabled={submitting} className="min-h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-60">
            + เพิ่มตำบล
          </button>
          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        </form>
      )}

      <div className="flex flex-col gap-1.5">
        {subDistricts.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            {editingId === s.id ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="min-h-8 flex-1 rounded-lg border border-slate-300 px-2 text-sm"
              />
            ) : (
              <span>
                {s.name}{" "}
                <span className="text-xs text-slate-400">
                  (อ.{s.district.name} จ.{s.district.province.name} · {s._count.villages} หมู่บ้าน)
                </span>
              </span>
            )}
            {canManage && (
              <div className="flex shrink-0 gap-1.5">
                {editingId === s.id ? (
                  <>
                    <button type="button" onClick={() => handleUpdate(s.id)} disabled={submitting} className="min-h-8 rounded-full bg-emerald-600 px-2.5 text-xs font-semibold text-white">
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
                        setEditingId(s.id);
                        setEditName(s.name);
                      }}
                      className="min-h-8 rounded-full border border-slate-300 px-2.5 text-xs font-semibold text-slate-600"
                    >
                      แก้ไข
                    </button>
                    <button type="button" onClick={() => handleDelete(s.id, s.name)} className="min-h-8 rounded-full border border-rose-300 px-2.5 text-xs font-semibold text-rose-700">
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
