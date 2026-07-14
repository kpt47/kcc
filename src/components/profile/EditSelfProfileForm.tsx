"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/form/TextField";

export function EditSelfProfileForm({
  role,
  phoneNumber,
  email,
  firstName,
  lastName,
}: {
  role: string;
  phoneNumber: string | null;
  email: string;
  firstName?: string;
  lastName?: string;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState(phoneNumber ?? "");
  const [mail, setMail] = useState(email ?? "");
  const [first, setFirst] = useState(firstName ?? "");
  const [last, setLast] = useState(lastName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canEditName = role !== "HOUSEHOLD";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber: phone || undefined,
        email: mail || undefined,
        firstName: canEditName ? first : undefined,
        lastName: canEditName ? last : undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? body?.error?.fieldErrors?.email?.[0] ?? "บันทึกไม่สำเร็จ");
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {canEditName && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="ชื่อ" value={first} onChange={(e) => setFirst(e.target.value)} />
          <TextField label="นามสกุล" value={last} onChange={(e) => setLast(e.target.value)} />
        </div>
      )}
      <TextField label="เบอร์โทรศัพท์" value={phone} onChange={(e) => setPhone(e.target.value)} hint="ใช้สำหรับส่ง SMS แจ้งเตือน" />
      <TextField
        label="อีเมล"
        type="email"
        required
        value={mail}
        onChange={(e) => setMail(e.target.value)}
        hint="ใช้รับรหัส OTP สำหรับกู้คืนรหัสผ่าน"
      />
      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
      {success && <p className="text-sm font-medium text-emerald-600">บันทึกข้อมูลสำเร็จแล้ว</p>}
      <button
        type="submit"
        disabled={submitting}
        className="min-h-11 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {submitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
      </button>
    </form>
  );
}
