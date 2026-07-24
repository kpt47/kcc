"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/form/TextField";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { inputClassName } from "@/components/form/inputStyles";
import { TITLE_PREFIX_OPTIONS } from "@/lib/schemas";

export function EditSelfProfileForm({
  role,
  phoneNumber,
  email,
  titlePrefix,
  titlePrefixOther,
  firstName,
  lastName,
}: {
  role: string;
  phoneNumber: string | null;
  email: string;
  titlePrefix?: string | null;
  titlePrefixOther?: string | null;
  firstName?: string;
  lastName?: string;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState(phoneNumber ?? "");
  const [mail, setMail] = useState(email ?? "");
  const [prefix, setPrefix] = useState(titlePrefix ?? "");
  const [prefixOther, setPrefixOther] = useState(titlePrefixOther ?? "");
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
        titlePrefix: canEditName ? prefix || undefined : undefined,
        titlePrefixOther: canEditName && prefix === "OTHER" ? prefixOther : undefined,
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
        <>
          <FieldWrapper label="คำนำหน้านาม">
            <select value={prefix} onChange={(e) => setPrefix(e.target.value)} className={inputClassName(false)}>
              <option value="">-- เลือกคำนำหน้านาม --</option>
              {TITLE_PREFIX_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FieldWrapper>
          {prefix === "OTHER" && (
            <TextField label="ระบุคำนำหน้านาม" required value={prefixOther} onChange={(e) => setPrefixOther(e.target.value)} />
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="ชื่อ" value={first} onChange={(e) => setFirst(e.target.value)} />
            <TextField label="นามสกุล" value={last} onChange={(e) => setLast(e.target.value)} />
          </div>
        </>
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
