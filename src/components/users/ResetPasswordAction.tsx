"use client";

import { useState } from "react";

export function ResetPasswordAction({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/users/${userId}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? body?.error?.fieldErrors?.newPassword?.[0] ?? "รีเซ็ตรหัสผ่านไม่สำเร็จ");
      return;
    }
    setSuccess(true);
    setNewPassword("");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setSuccess(false);
        }}
        className="inline-flex min-h-9 items-center rounded-full border border-amber-300 px-3 text-xs font-semibold text-amber-800 hover:bg-amber-50"
      >
        รีเซ็ตรหัสผ่าน
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)"
        required
        className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm"
      />
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      {success && <p className="text-xs font-medium text-emerald-700">รีเซ็ตรหัสผ่านสำเร็จแล้ว</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="min-h-9 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white disabled:opacity-60">
          {submitting ? "กำลังบันทึก..." : "ยืนยันการรีเซ็ต"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-9 rounded-lg px-3 text-xs text-slate-500">
          ปิด
        </button>
      </div>
    </form>
  );
}
