"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmDialog } from "@/lib/confirmDialog";
import { ThaiDateField } from "@/components/form/ThaiDateField";

const COMMITTEE_ROLE_OPTIONS = [
  { value: "CHAIRMAN", label: "ประธานคณะกรรมการ" },
  { value: "SECRETARY", label: "เลขานุการ" },
  { value: "FINANCE_MEMBER", label: "กรรมการเงินทุน" },
  { value: "NORMAL_MEMBER", label: "กรรมการทั่วไป" },
];

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
      />
    </svg>
  );
}

const PHONE_REGEX = /^0\d{8,9}$/;
const PHONE_ERROR = "เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลัก และขึ้นต้นด้วย 0";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_ERROR = "รูปแบบอีเมลไม่ถูกต้อง";

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
    </svg>
  );
}

function toDateInputValue(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

type HouseholdProfile = { age: number | null; occupation: string | null; consentPersonName: string | null; consentRelation: string | null } | null;
type CommitteeProfile = { firstName: string; lastName: string; termStartDate: Date | string | null; termEndDate: Date | string | null } | null;
type OfficialProfile = { firstName: string; lastName: string; positionTitle: string | null; handoverDate: Date | string | null } | null;

export function EditUserAction({
  userId,
  displayName,
  role,
  committeeRole,
  phoneNumber,
  email,
  isActive,
  isVillageCommittee,
  householdProfile,
  committeeProfile,
  officialProfile,
}: {
  userId: number;
  displayName: string;
  role: string;
  committeeRole: string | null;
  phoneNumber: string;
  email: string;
  isActive: boolean;
  isVillageCommittee: boolean;
  householdProfile?: HouseholdProfile;
  committeeProfile?: CommitteeProfile;
  officialProfile?: OfficialProfile;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState(committeeProfile?.firstName ?? officialProfile?.firstName ?? "");
  const [lastName, setLastName] = useState(committeeProfile?.lastName ?? officialProfile?.lastName ?? "");
  const [phone, setPhone] = useState(phoneNumber);
  const [mail, setMail] = useState(email);
  const [role_, setRole] = useState(committeeRole ?? "");
  const [age, setAge] = useState(householdProfile?.age != null ? String(householdProfile.age) : "");
  const [occupation, setOccupation] = useState(householdProfile?.occupation ?? "");
  const [consentPersonName, setConsentPersonName] = useState(householdProfile?.consentPersonName ?? "");
  const [consentRelation, setConsentRelation] = useState(householdProfile?.consentRelation ?? "");
  const [termStartDate, setTermStartDate] = useState(toDateInputValue(committeeProfile?.termStartDate));
  const [termEndDate, setTermEndDate] = useState(toDateInputValue(committeeProfile?.termEndDate));
  const [positionTitle, setPositionTitle] = useState(officialProfile?.positionTitle ?? "");
  const [handoverDate, setHandoverDate] = useState(toDateInputValue(officialProfile?.handoverDate));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!PHONE_REGEX.test(phone)) {
      setError(PHONE_ERROR);
      return;
    }
    if (!EMAIL_REGEX.test(mail)) {
      setError(EMAIL_ERROR);
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        committeeRole: isVillageCommittee ? role_ || undefined : undefined,
        firstName: role === "HOUSEHOLD" ? undefined : firstName,
        lastName: role === "HOUSEHOLD" ? undefined : lastName,
        phoneNumber: phone,
        email: mail,
        age: role === "HOUSEHOLD" && age ? Number(age) : undefined,
        occupation: role === "HOUSEHOLD" ? occupation || undefined : undefined,
        consentPersonName: role === "HOUSEHOLD" ? consentPersonName || undefined : undefined,
        consentRelation: role === "HOUSEHOLD" ? consentRelation || undefined : undefined,
        termStartDate: isVillageCommittee ? termStartDate || undefined : undefined,
        termEndDate: isVillageCommittee ? termEndDate || undefined : undefined,
        positionTitle: !isVillageCommittee && role !== "HOUSEHOLD" ? positionTitle || undefined : undefined,
        handoverDate: !isVillageCommittee && role !== "HOUSEHOLD" ? handoverDate || undefined : undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? "บันทึกไม่สำเร็จ");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function handleToggleActive() {
    const confirmed = isActive
      ? await confirmDialog({
          title: "ระงับการใช้งานบัญชีนี้?",
          text: `คุณแน่ใจหรือไม่ที่จะระงับบัญชีของ "${displayName}"? ผู้ใช้นี้จะไม่สามารถเข้าสู่ระบบได้อีกจนกว่าจะเปิดใช้งานใหม่`,
          tone: "danger",
          confirmButtonText: "ระงับการใช้งาน",
        })
      : await confirmDialog({
          title: "เปิดใช้งานบัญชีนี้อีกครั้ง?",
          text: `ผู้ใช้ "${displayName}" จะสามารถเข้าสู่ระบบได้อีกครั้ง`,
          confirmButtonText: "เปิดใช้งาน",
        });
    if (!confirmed) return;

    setSubmitting(true);
    // ระงับการใช้งาน = Soft Delete (DELETE /api/users/:id ตั้ง isActive:false เท่านั้น ไม่ลบข้อมูลจริง)
    // เปิดใช้งานอีกครั้งไม่ใช่การลบ จึงยังคงใช้ PATCH ตามเดิม
    const res = isActive
      ? await fetch(`/api/users/${userId}`, { method: "DELETE" })
      : await fetch(`/api/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: true }),
        });
    setSubmitting(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
      >
        <PencilIcon />
        แก้ไขข้อมูล
      </button>
      <button
        type="button"
        onClick={handleToggleActive}
        disabled={submitting}
        className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold disabled:opacity-60 ${
          isActive ? "border-rose-300 text-rose-700 hover:bg-rose-50" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        }`}
      >
        <TrashIcon />
        {isActive ? "ระงับการใช้งาน" : "เปิดใช้งานอีกครั้ง"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-base font-bold text-slate-900">แก้ไขข้อมูลผู้ใช้งาน</h2>
            <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
              {role === "HOUSEHOLD" ? (
                <>
                  <p className="text-xs text-slate-500">
                    ชื่อ-สกุลของครัวเรือนอ้างอิงจากทะเบียนครัวเรือนเป้าหมาย แก้ไขได้ที่หน้า &quot;ทะเบียนครัวเรือน&quot;
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="อายุ"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="อาชีพ"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="ชื่อผู้ให้ความยินยอม"
                    value={consentPersonName}
                    onChange={(e) => setConsentPersonName(e.target.value)}
                    className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="ความสัมพันธ์ (เช่น ภรรยา/สามี/ทายาท)"
                    value={consentRelation}
                    onChange={(e) => setConsentRelation(e.target.value)}
                    className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="ชื่อ"
                    required
                    className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
                  />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="นามสกุล"
                    required
                    className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </>
              )}

              <div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="เบอร์โทรศัพท์ (เช่น 0812345678)"
                  required
                  pattern="0\d{8,9}"
                  title={PHONE_ERROR}
                  className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
                {phone.length > 0 && !PHONE_REGEX.test(phone) && <p className="mt-1 text-xs text-rose-600">{PHONE_ERROR}</p>}
              </div>

              <div>
                <input
                  type="email"
                  value={mail}
                  onChange={(e) => setMail(e.target.value)}
                  placeholder="อีเมล (ใช้รับรหัส OTP)"
                  required
                  className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
                {mail.length > 0 && !EMAIL_REGEX.test(mail) && <p className="mt-1 text-xs text-rose-600">{EMAIL_ERROR}</p>}
              </div>

              {isVillageCommittee && (
                <>
                  <select
                    value={role_}
                    onChange={(e) => setRole(e.target.value)}
                    className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
                  >
                    <option value="">-- ตำแหน่งในคณะกรรมการ --</option>
                    {COMMITTEE_ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <ThaiDateField
                      label="วันที่เริ่มวาระ"
                      value={termStartDate}
                      onChange={(isoDate) => setTermStartDate(isoDate ?? "")}
                    />
                    <ThaiDateField
                      label="วันที่สิ้นสุดวาระ"
                      value={termEndDate}
                      onChange={(isoDate) => setTermEndDate(isoDate ?? "")}
                    />
                  </div>
                </>
              )}

              {!isVillageCommittee && role !== "HOUSEHOLD" && (
                <>
                  <input
                    type="text"
                    placeholder="ตำแหน่งทางการ"
                    value={positionTitle}
                    onChange={(e) => setPositionTitle(e.target.value)}
                    className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
                  />
                  <ThaiDateField
                    label="วันที่รับมอบงาน"
                    value={handoverDate}
                    onChange={(isoDate) => setHandoverDate(isoDate ?? "")}
                  />
                </>
              )}

              {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
              <div className="mt-1 flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-11 flex-1 rounded-lg bg-slate-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? "กำลังบันทึก..." : "บันทึก"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-600"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
