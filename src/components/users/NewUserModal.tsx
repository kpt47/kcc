"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HouseholdSelect, type HouseholdOption } from "@/components/form/HouseholdSelect";
import { AddressCombobox, type AddressOption } from "@/components/form/AddressCombobox";
import { ThaiDateField } from "@/components/form/ThaiDateField";
import { calculateAge } from "@/lib/thai";
import { TITLE_PREFIX_OPTIONS } from "@/lib/schemas";
import type { GlobalRole } from "@/generated/prisma/client";

type AreaOption = { id: number; label: string };
type CreatableAreas = {
  targetRole: string | null;
  targetRoleLabel: string | null;
  areaField: string | null;
  options: AreaOption[];
  creatorRole: GlobalRole;
  inheritedAreaLabel: string | null;
};

const AREA_FIELD_LABEL: Record<string, string> = {
  scopeProvinceId: "จังหวัด",
  scopeDistrictId: "อำเภอ",
  scopeSubDistrictId: "ตำบล",
  scopeVillageId: "หมู่บ้าน",
};

const PHONE_REGEX = /^0\d{8,9}$/;
const PHONE_ERROR = "เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลัก และขึ้นต้นด้วย 0";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_ERROR = "รูปแบบอีเมลไม่ถูกต้อง";

const COMMITTEE_ROLE_OPTIONS = [
  { value: "CHAIRMAN", label: "ประธานคณะกรรมการ" },
  { value: "SECRETARY", label: "เลขานุการ" },
  { value: "FINANCE_MEMBER", label: "กรรมการเงินทุน" },
  { value: "NORMAL_MEMBER", label: "กรรมการทั่วไป" },
];

export function NewUserModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [areas, setAreas] = useState<CreatableAreas | null>(null);

  const [username, setUsername] = useState("");
  const [titlePrefix, setTitlePrefix] = useState("");
  const [titlePrefixOther, setTitlePrefixOther] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [isItSupport, setIsItSupport] = useState(false);
  const [areaId, setAreaId] = useState<number | undefined>();
  const [committeeRole, setCommitteeRole] = useState("");
  const [householdId, setHouseholdId] = useState<number | undefined>();
  // HOUSEHOLD profile
  const [age, setAge] = useState("");
  const [occupation, setOccupation] = useState("");
  const [consentPersonName, setConsentPersonName] = useState("");
  const [consentRelation, setConsentRelation] = useState("");
  // VILLAGE_COMMITTEE profile
  const [termStartDate, setTermStartDate] = useState("");
  const [termEndDate, setTermEndDate] = useState("");
  // เจ้าหน้าที่รัฐ profile
  const [positionTitle, setPositionTitle] = useState("");
  const [handoverDate, setHandoverDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/users/creatable-areas")
      .then((r) => r.json())
      .then((data) => setAreas(data));
  }, [open]);

  // เลือกครัวเรือนเป้าหมายแล้ว: เติมชื่อ/นามสกุล/อายุ (คำนวณจากวันเกิด)/อาชีพ/เบอร์โทรศัพท์/ผู้ให้ความยินยอม/
  // ความสัมพันธ์ ให้อัตโนมัติจากข้อมูลที่มีอยู่แล้วในทะเบียนครัวเรือน — ยกเว้นชื่อผู้ใช้/รหัสผ่าน/อีเมล ยังต้องกรอกเองเสมอ
  // (ยังแก้ไขทับค่าที่เติมมาได้ตามปกติ เผื่อครัวเรือนยังไม่มีข้อมูลบางส่วน หรือข้อมูลเปลี่ยนไปแล้ว)
  function handleSelectHousehold(household: HouseholdOption | undefined) {
    setHouseholdId(household?.id);
    if (!household) return;
    setFirstName(household.headFirstName);
    setLastName(household.headLastName);
    const computedAge = calculateAge(household.birthDate);
    if (computedAge !== undefined) setAge(String(computedAge));
    if (household.occupation) setOccupation(household.occupation);
    if (household.phoneNumber) setPhoneNumber(household.phoneNumber);
    if (household.consentPersonName) setConsentPersonName(household.consentPersonName);
    if (household.consentRelation) setConsentRelation(household.consentRelation);
  }

  function resetForm() {
    setUsername("");
    setTitlePrefix("");
    setTitlePrefixOther("");
    setFirstName("");
    setLastName("");
    setPassword("");
    setPhoneNumber("");
    setEmail("");
    setIsItSupport(false);
    setAreaId(undefined);
    setCommitteeRole("");
    setHouseholdId(undefined);
    setAge("");
    setOccupation("");
    setConsentPersonName("");
    setConsentRelation("");
    setTermStartDate("");
    setTermEndDate("");
    setPositionTitle("");
    setHandoverDate("");
    setError(null);
  }

  // เฉพาะ GLOBAL_ADMIN เท่านั้นที่ areaField จะเป็น "scopeProvinceId" (สร้างบัญชีพัฒนาการจังหวัด) จึงเป็นระดับ
  // เดียวที่ต้องรองรับการ "+ เพิ่มข้อมูล..." จากฟอร์มนี้ — ระดับอื่น (อำเภอ/ตำบล/หมู่บ้าน) เป็นสิทธิ์ของผู้ดูแล
  // ระดับต่ำกว่า ซึ่งไม่มีสิทธิ์สร้างพื้นที่ใหม่อยู่แล้วตามระเบียบ
  async function createArea(name: string): Promise<AddressOption | null> {
    if (areas?.areaField !== "scopeProvinceId") return null;
    const res = await fetch("/api/master-data/provinces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return null;
    const created = await res.json();
    setAreas((prev) =>
      prev ? { ...prev, options: [...prev.options, { id: created.id, label: created.name }] } : prev
    );
    return { id: created.id, name: created.name };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!PHONE_REGEX.test(phoneNumber)) {
      setError(PHONE_ERROR);
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setError(EMAIL_ERROR);
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        titlePrefix: titlePrefix || undefined,
        titlePrefixOther: titlePrefix === "OTHER" ? titlePrefixOther : undefined,
        firstName,
        lastName,
        password,
        phoneNumber,
        email,
        requestedRole: isItSupport ? "IT_SUPPORT" : undefined,
        areaId: isItSupport ? undefined : areaId,
        committeeRole: committeeRole || undefined,
        householdId,
        age: age ? Number(age) : undefined,
        occupation: occupation || undefined,
        consentPersonName: consentPersonName || undefined,
        consentRelation: consentRelation || undefined,
        termStartDate: termStartDate || undefined,
        termEndDate: termEndDate || undefined,
        positionTitle: positionTitle || undefined,
        handoverDate: handoverDate || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(
        body?.error?.formErrors?.[0] ??
          body?.error?.fieldErrors?.username?.[0] ??
          body?.error?.fieldErrors?.phoneNumber?.[0] ??
          body?.error?.fieldErrors?.email?.[0] ??
          body?.error?.fieldErrors?.areaId?.[0] ??
          body?.error?.fieldErrors?.committeeRole?.[0] ??
          "สร้างบัญชีไม่สำเร็จ"
      );
      return;
    }
    setOpen(false);
    resetForm();
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center rounded-full bg-emerald-600 px-3.5 text-sm font-semibold text-white"
      >
        + เพิ่มผู้ใช้งานใหม่
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">เพิ่มผู้ใช้งานใหม่</h2>
        {!areas ? (
          <p className="mt-4 text-sm text-slate-500">กำลังโหลดตัวเลือก...</p>
        ) : !areas.targetRole ? (
          <p className="mt-4 text-sm text-rose-600">คุณไม่มีสิทธิ์สร้างบัญชีผู้ใช้งาน</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">บทบาท (Role)</label>
              <select disabled className="min-h-11 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 text-sm">
                <option>{isItSupport ? "ผู้ดูแลระบบ (IT_SUPPORT)" : areas.targetRoleLabel}</option>
              </select>
            </div>

            {areas.targetRole === "PROVINCIAL_ADMIN" && (
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isItSupport}
                  onChange={(e) => setIsItSupport(e.target.checked)}
                  className="h-4 w-4"
                />
                สร้างเป็นบัญชีผู้ดูแลระบบ (IT_SUPPORT) แทน — ไม่มีสิทธิ์เข้าถึงข้อมูลสมุดทะเบียนโครงการ
              </label>
            )}

            <input
              type="text"
              placeholder="ชื่อผู้ใช้ (username)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
            />
            {areas.targetRole !== "HOUSEHOLD" && (
              <div>
                <select
                  value={titlePrefix}
                  onChange={(e) => setTitlePrefix(e.target.value)}
                  required
                  className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                >
                  <option value="">-- เลือกคำนำหน้านาม --</option>
                  {TITLE_PREFIX_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {titlePrefix === "OTHER" && (
                  <input
                    type="text"
                    placeholder="ระบุคำนำหน้านาม"
                    value={titlePrefixOther}
                    onChange={(e) => setTitlePrefixOther(e.target.value)}
                    required
                    className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="ชื่อ"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
              />
              <input
                type="text"
                placeholder="นามสกุล"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>
            <input
              type="password"
              placeholder="รหัสผ่านเริ่มต้น (อย่างน้อย 8 ตัวอักษร)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
            />
            <div>
              <input
                type="tel"
                placeholder="เบอร์โทรศัพท์ (เช่น 0812345678)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                pattern="0\d{8,9}"
                title={PHONE_ERROR}
                className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
              {phoneNumber.length > 0 && !PHONE_REGEX.test(phoneNumber) && (
                <p className="mt-1 text-xs text-rose-600">{PHONE_ERROR}</p>
              )}
            </div>
            <div>
              <input
                type="email"
                placeholder="อีเมล (ใช้รับรหัส OTP)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
              {email.length > 0 && !EMAIL_REGEX.test(email) && <p className="mt-1 text-xs text-rose-600">{EMAIL_ERROR}</p>}
            </div>

            {areas.areaField && !isItSupport && (
              <div>
                <AddressCombobox
                  label={AREA_FIELD_LABEL[areas.areaField] ?? "พื้นที่ที่รับผิดชอบ"}
                  options={areas.options.map((o) => ({ id: o.id, name: o.label }))}
                  value={areaId}
                  onChange={(o) => setAreaId(o?.id)}
                  currentUser={{ role: areas.creatorRole }}
                  onCreate={areas.areaField === "scopeProvinceId" ? createArea : undefined}
                  required
                />
                {areas.options.length === 0 && areas.creatorRole !== "GLOBAL_ADMIN" && (
                  <p className="mt-1 text-xs text-rose-600">ไม่พบพื้นที่ย่อยให้เลือก กรุณาติดต่อผู้ดูแลระบบ</p>
                )}
              </div>
            )}

            {!areas.areaField && !isItSupport && areas.inheritedAreaLabel && (
              <AddressCombobox
                label="พื้นที่ที่รับผิดชอบ"
                options={[]}
                value={undefined}
                onChange={() => {}}
                currentUser={{ role: areas.creatorRole }}
                lockedLabel={areas.inheritedAreaLabel}
              />
            )}

            {areas.targetRole === "VILLAGE_COMMITTEE" && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">ตำแหน่งในคณะกรรมการหมู่บ้าน</label>
                  <select
                    value={committeeRole}
                    onChange={(e) => setCommitteeRole(e.target.value)}
                    required
                    className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  >
                    <option value="">-- เลือกตำแหน่ง --</option>
                    {COMMITTEE_ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
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

            {areas.targetRole === "HOUSEHOLD" && (
              <>
                <HouseholdSelect
                  label="ผูกกับครัวเรือนเป้าหมาย (ถ้ามี)"
                  value={householdId}
                  onChange={setHouseholdId}
                  onSelectHousehold={handleSelectHousehold}
                />
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
            )}

            {areas.targetRole && areas.targetRole !== "HOUSEHOLD" && areas.targetRole !== "VILLAGE_COMMITTEE" && (
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

            <div className="mt-2 flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="min-h-11 flex-1 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting ? "กำลังบันทึก..." : "สร้างบัญชี"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-600"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
