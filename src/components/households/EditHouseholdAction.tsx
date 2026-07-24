"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmDialog } from "@/lib/confirmDialog";
import { ThaiDateField } from "@/components/form/ThaiDateField";
import { TITLE_PREFIX_OPTIONS, GENDER_OPTIONS } from "@/lib/schemas";

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

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
    </svg>
  );
}

const PHONE_REGEX = /^0\d{8,9}$/;
const PHONE_ERROR = "เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลัก และขึ้นต้นด้วย 0";

export type EditableHousehold = {
  id: number;
  displayName: string;
  titlePrefix: "MR" | "MRS" | "MISS" | "OTHER" | null;
  titlePrefixOther: string | null;
  headFirstName: string;
  headLastName: string;
  gender: "MALE" | "FEMALE" | null;
  birthDate: string | null;
  occupation: string | null;
  specialSkills: string | null;
  phoneNumber: string | null;
  houseNo: string | null;
  memberCount: number | null;
  incomeBeforeLoan: number | null;
  isDefaulted: boolean;
  defaultedAmount: number | null;
};

// แก้ไข/ลบทะเบียนครัวเรือนเป้าหมาย (เล่มม่วง) — แก้ไขได้เฉพาะพัฒนากรตำบล/ประธานกรรมการหมู่บ้าน
// ลบได้เฉพาะประธานกรรมการหมู่บ้าน (ดู canEditHousehold/canDeleteHousehold ใน lib/authz.ts)
export function EditHouseholdAction({
  household,
  canEdit,
  canDelete,
}: {
  household: EditableHousehold;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [titlePrefix, setTitlePrefix] = useState(household.titlePrefix ?? "");
  const [titlePrefixOther, setTitlePrefixOther] = useState(household.titlePrefixOther ?? "");
  const [headFirstName, setHeadFirstName] = useState(household.headFirstName);
  const [headLastName, setHeadLastName] = useState(household.headLastName);
  const [gender, setGender] = useState(household.gender ?? "");
  const [birthDate, setBirthDate] = useState<string | undefined>(household.birthDate ?? undefined);
  const [occupation, setOccupation] = useState(household.occupation ?? "");
  const [specialSkills, setSpecialSkills] = useState(household.specialSkills ?? "");
  const [phoneNumber, setPhoneNumber] = useState(household.phoneNumber ?? "");
  const [houseNo, setHouseNo] = useState(household.houseNo ?? "");
  const [memberCount, setMemberCount] = useState(household.memberCount != null ? String(household.memberCount) : "");
  const [incomeBeforeLoan, setIncomeBeforeLoan] = useState(
    household.incomeBeforeLoan != null ? String(household.incomeBeforeLoan) : ""
  );
  const [isDefaulted, setIsDefaulted] = useState(household.isDefaulted);
  const [defaultedAmount, setDefaultedAmount] = useState(
    household.defaultedAmount != null ? String(household.defaultedAmount) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (phoneNumber && !PHONE_REGEX.test(phoneNumber)) {
      setError(PHONE_ERROR);
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/households/${household.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titlePrefix: titlePrefix || undefined,
        titlePrefixOther: titlePrefix === "OTHER" ? titlePrefixOther || undefined : undefined,
        headFirstName,
        headLastName,
        gender: gender || undefined,
        birthDate: birthDate || undefined,
        occupation: occupation || undefined,
        specialSkills: specialSkills || undefined,
        phoneNumber: phoneNumber || undefined,
        houseNo: houseNo || undefined,
        memberCount: memberCount ? Number(memberCount) : undefined,
        incomeBeforeLoan: incomeBeforeLoan ? Number(incomeBeforeLoan) : undefined,
        isDefaulted,
        defaultedAmount: isDefaulted && defaultedAmount ? Number(defaultedAmount) : undefined,
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

  async function handleDelete() {
    const confirmed = await confirmDialog({
      title: "ลบทะเบียนครัวเรือนนี้?",
      text: `คุณแน่ใจหรือไม่ที่จะลบทะเบียนของ "${household.displayName}"? การลบไม่สามารถย้อนกลับได้`,
      tone: "danger",
      confirmButtonText: "ยืนยันลบ",
    });
    if (!confirmed) return;

    setSubmitting(true);
    const res = await fetch(`/api/households/${household.id}`, { method: "DELETE" });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? "ลบไม่สำเร็จ");
      return;
    }
    router.refresh();
  }

  if (!canEdit && !canDelete) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <PencilIcon />
          แก้ไขข้อมูล
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={submitting}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-rose-300 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
        >
          <TrashIcon />
          ลบ
        </button>
      )}
      {error && !open && <p className="text-xs font-medium text-rose-600">{error}</p>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-base font-bold text-slate-900">แก้ไขทะเบียนครัวเรือนเป้าหมาย</h2>
            <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={titlePrefix}
                  onChange={(e) => setTitlePrefix(e.target.value as typeof titlePrefix)}
                  className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
                >
                  <option value="">-- คำนำหน้า --</option>
                  {TITLE_PREFIX_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {titlePrefix === "OTHER" && (
                  <input
                    type="text"
                    value={titlePrefixOther}
                    onChange={(e) => setTitlePrefixOther(e.target.value)}
                    placeholder="ระบุคำนำหน้า"
                    className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={headFirstName}
                  onChange={(e) => setHeadFirstName(e.target.value)}
                  placeholder="ชื่อ"
                  required
                  className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
                />
                <input
                  type="text"
                  value={headLastName}
                  onChange={(e) => setHeadLastName(e.target.value)}
                  placeholder="นามสกุล"
                  required
                  className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as typeof gender)}
                  className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
                >
                  <option value="">-- เพศ --</option>
                  {GENDER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ThaiDateField
                  label="วันเดือนปีเกิด"
                  value={birthDate}
                  onChange={setBirthDate}
                  fromBeYearOffset={-100}
                  toBeYearOffset={-19}
                />
              </div>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="อาชีพ"
                className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
              />
              <input
                type="text"
                value={specialSkills}
                onChange={(e) => setSpecialSkills(e.target.value)}
                placeholder="ความสามารถพิเศษ"
                className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
              />
              <div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="เบอร์โทรศัพท์ครัวเรือน"
                  className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
                {phoneNumber.length > 0 && !PHONE_REGEX.test(phoneNumber) && (
                  <p className="mt-1 text-xs text-rose-600">{PHONE_ERROR}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={houseNo}
                  onChange={(e) => setHouseNo(e.target.value)}
                  placeholder="บ้านเลขที่"
                  className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
                />
                <input
                  type="number"
                  value={memberCount}
                  onChange={(e) => setMemberCount(e.target.value)}
                  placeholder="จำนวนสมาชิก (คน)"
                  className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
                />
              </div>
              <input
                type="number"
                value={incomeBeforeLoan}
                onChange={(e) => setIncomeBeforeLoan(e.target.value)}
                placeholder="รายได้เฉลี่ยก่อนยืมเงิน (บาท)"
                className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={isDefaulted} onChange={(e) => setIsDefaulted(e.target.checked)} />
                ผิดสัญญา
              </label>
              {isDefaulted && (
                <input
                  type="number"
                  value={defaultedAmount}
                  onChange={(e) => setDefaultedAmount(e.target.value)}
                  placeholder="จำนวนเงินที่ผิดสัญญา (บาท)"
                  className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
                />
              )}

              {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
              <div className="mt-1 flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-11 flex-1 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
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
