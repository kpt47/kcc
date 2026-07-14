"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmDialog } from "@/lib/confirmDialog";
import { AddressCombobox, type AddressOption } from "@/components/form/AddressCombobox";
import type { GlobalRole } from "@/generated/prisma/client";

export type DistrictRow = {
  id: number;
  name: string;
  province: { id: number; name: string };
  _count: { subDistricts: number };
};

export function DistrictManager({
  districts,
  provinces,
  canManage,
  currentUser,
}: {
  districts: DistrictRow[];
  provinces: { id: number; name: string }[];
  canManage: boolean;
  currentUser: Pick<{ role: GlobalRole }, "role">;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [newProvinceId, setNewProvinceId] = useState<number | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function createProvince(name: string): Promise<AddressOption | null> {
    const res = await fetch("/api/master-data/provinces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return null;
    const created = await res.json();
    router.refresh();
    return { id: created.id, name: created.name };
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newProvinceId) {
      setError("กรุณาเลือกจังหวัด");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/master-data/districts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, provinceId: newProvinceId }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? body?.error?.fieldErrors?.name?.[0] ?? body?.error?.fieldErrors?.provinceId?.[0] ?? "บันทึกไม่สำเร็จ");
      return;
    }
    setNewName("");
    setNewProvinceId(undefined);
    router.refresh();
  }

  async function handleUpdate(id: number) {
    setSubmitting(true);
    const res = await fetch(`/api/master-data/districts/${id}`, {
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
      title: "ยืนยันการลบอำเภอ",
      text: `คุณต้องการลบ "${name}" ใช่หรือไม่? การลบจะทำไม่ได้หากยังมีตำบลผูกอยู่`,
      tone: "danger",
      confirmButtonText: "ยืนยันลบ",
    });
    if (!confirmed) return;
    const res = await fetch(`/api/master-data/districts/${id}`, { method: "DELETE" });
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
              onChange={(o) => setNewProvinceId(o?.id)}
              currentUser={currentUser}
              onCreate={createProvince}
              required
            />
          </div>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="ชื่ออำเภอใหม่"
            required
            className="min-h-10 rounded-lg border border-slate-300 px-2 text-sm"
          />
          <button type="submit" disabled={submitting} className="min-h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-60">
            + เพิ่มอำเภอ
          </button>
          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        </form>
      )}

      <div className="flex flex-col gap-1.5">
        {districts.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            {editingId === d.id ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="min-h-8 flex-1 rounded-lg border border-slate-300 px-2 text-sm"
              />
            ) : (
              <span>
                {d.name} <span className="text-xs text-slate-400">(จ.{d.province.name} · {d._count.subDistricts} ตำบล)</span>
              </span>
            )}
            {canManage && (
              <div className="flex shrink-0 gap-1.5">
                {editingId === d.id ? (
                  <>
                    <button type="button" onClick={() => handleUpdate(d.id)} disabled={submitting} className="min-h-8 rounded-full bg-emerald-600 px-2.5 text-xs font-semibold text-white">
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
                        setEditingId(d.id);
                        setEditName(d.name);
                      }}
                      className="min-h-8 rounded-full border border-slate-300 px-2.5 text-xs font-semibold text-slate-600"
                    >
                      แก้ไข
                    </button>
                    <button type="button" onClick={() => handleDelete(d.id, d.name)} className="min-h-8 rounded-full border border-rose-300 px-2.5 text-xs font-semibold text-rose-700">
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
