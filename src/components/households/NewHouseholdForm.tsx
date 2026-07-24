"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageContainer, SectionCard } from "@/components/layout/PageContainer";
import { TextField } from "@/components/form/TextField";
import { MoneyField } from "@/components/form/MoneyField";
import { VillagePicker } from "@/components/form/VillagePicker";
import { ThaiDateField } from "@/components/form/ThaiDateField";
import { successAlert } from "@/lib/confirmDialog";
import {
  householdSchema,
  TITLE_PREFIX_OPTIONS,
  GENDER_OPTIONS,
  type HouseholdFormValues,
  type HouseholdSubmitValues,
} from "@/lib/schemas";

// ประธาน/เลขานุการคณะกรรมการหมู่บ้าน (VILLAGE_COMMITTEE) เพิ่มครัวเรือนได้เฉพาะหมู่บ้านของตนเองเท่านั้น
// จึงไม่ต้องเลือกหมู่บ้านเลย (ล็อกไว้ให้อัตโนมัติ ไม่แสดง VillagePicker) — ส่วนพัฒนากรตำบล (SUB_DISTRICT_ADMIN)
// ดูแลหลายหมู่บ้าน จึงยังต้องเลือกหมู่บ้านจาก VillagePicker ตามปกติ (ดู src/app/households/new/page.tsx)
export function NewHouseholdForm({ lockedVillage }: { lockedVillage: { id: number; label: string } | null }) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HouseholdFormValues, unknown, HouseholdSubmitValues>({
    resolver: zodResolver(householdSchema),
    defaultValues: lockedVillage ? { villageId: lockedVillage.id } : undefined,
  });

  const values = watch();

  async function onSubmit(data: HouseholdSubmitValues) {
    setSubmitError(null);
    const res = await fetch("/api/households", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setSubmitError(
        body?.error?.formErrors?.[0] ?? "บันทึกข้อมูลไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง"
      );
      return;
    }
    reset(lockedVillage ? { villageId: lockedVillage.id } : undefined);
    await successAlert("บันทึกข้อมูลครัวเรือนเป้าหมายเรียบร้อยแล้ว ✓ กรอกรายการถัดไปได้เลย");
  }

  return (
    <PageContainer
      title="ลงทะเบียนครัวเรือนเป้าหมาย"
      subtitle="บัญชีทะเบียนครัวเรือนเป้าหมาย โครงการแก้ไขปัญหาความยากจน (กข.คจ.)"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <SectionCard title="หมู่บ้าน" description="ครัวเรือนนี้จะถูกบันทึกเข้าหมู่บ้านใด">
          {lockedVillage ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              {lockedVillage.label}
              <span className="ml-2 text-xs text-slate-400">(ล็อกไว้ตามหมู่บ้านของท่าน)</span>
            </div>
          ) : (
            <Controller
              control={control}
              name="villageId"
              render={({ field }) => (
                <VillagePicker
                  label="หมู่บ้าน"
                  required
                  error={errors.villageId?.message}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          )}
        </SectionCard>

        <SectionCard title="ข้อมูลครัวเรือนเป้าหมาย" description="ข้อมูลตามบัญชีทะเบียนครัวเรือนเป้าหมาย (เล่มม่วง)">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="ลำดับที่ครัวเรือนเป้าหมาย"
              required
              type="number"
              inputMode="numeric"
              min={1}
              hint="เรียงจากรายได้เฉลี่ยน้อยไปมาก"
              error={errors.sequenceNo?.message}
              {...register("sequenceNo", { valueAsNumber: true })}
            />
            <TextField
              label="บ้านเลขที่"
              error={errors.houseNo?.message}
              {...register("houseNo")}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">คำนำหน้าชื่อ</label>
              <select
                className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                {...register("titlePrefix")}
              >
                <option value="">-- เลือกคำนำหน้า --</option>
                {TITLE_PREFIX_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {values.titlePrefix === "OTHER" && (
              <TextField
                label="ระบุคำนำหน้าชื่อ"
                required
                error={errors.titlePrefixOther?.message}
                {...register("titlePrefixOther")}
              />
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="ชื่อ (หัวหน้าครัวเรือน)"
              required
              error={errors.headFirstName?.message}
              {...register("headFirstName")}
            />
            <TextField
              label="นามสกุล"
              required
              error={errors.headLastName?.message}
              {...register("headLastName")}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">เพศ</label>
              <div className="flex min-h-11 items-center gap-4">
                {GENDER_OPTIONS.map((o) => (
                  <label key={o.value} className="flex items-center gap-1.5 text-sm text-slate-700">
                    <input type="radio" value={o.value} {...register("gender")} /> {o.label}
                  </label>
                ))}
              </div>
            </div>
            <Controller
              control={control}
              name="birthDate"
              render={({ field }) => (
                <ThaiDateField
                  label="วันเดือนปีเกิด"
                  value={field.value}
                  onChange={field.onChange}
                  fromBeYearOffset={-100}
                  toBeYearOffset={-19}
                />
              )}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="อาชีพ" error={errors.occupation?.message} {...register("occupation")} />
            <TextField
              label="ความสามารถพิเศษ"
              error={errors.specialSkills?.message}
              {...register("specialSkills")}
            />
          </div>
          <TextField
            label="เบอร์โทรศัพท์ครัวเรือน"
            type="tel"
            hint="เห็นได้เฉพาะครัวเรือนเอง ประธาน/เลขานุการ/ฝ่ายการเงิน พัฒนากรตำบล และผู้บริหารอำเภอเท่านั้น"
            error={errors.phoneNumber?.message}
            {...register("phoneNumber")}
          />
          <TextField
            label="จำนวนสมาชิกในครัวเรือน (คน)"
            type="number"
            inputMode="numeric"
            min={1}
            error={errors.memberCount?.message}
            {...register("memberCount", { valueAsNumber: true })}
          />
        </SectionCard>

        <SectionCard
          title="รายได้เฉลี่ยตามเกณฑ์ จปฐ. ก่อนยืมเงิน"
          description="รายได้เฉลี่ยต่อคนต่อปี ก่อนได้รับเงินยืม (บาท)"
        >
          <MoneyField
            label="รายได้เฉลี่ยต่อคนต่อปี ก่อนยืมเงิน"
            error={errors.incomeBeforeLoan?.message}
            amountValue={values.incomeBeforeLoan}
            {...register("incomeBeforeLoan", { valueAsNumber: true })}
          />
        </SectionCard>

        <SectionCard
          title="รายได้เฉลี่ยภายหลังรับเงินยืม"
          description="กรอกเมื่อทราบผล — สามารถเว้นว่างไว้ก่อนแล้วกลับมาเพิ่มเติมภายหลังได้"
        >
          <MoneyField
            label="รายได้เฉลี่ยต่อคนต่อปี ภายหลัง 1 ปี"
            error={errors.incomeAfter1?.message}
            amountValue={values.incomeAfter1}
            {...register("incomeAfter1", { valueAsNumber: true })}
          />
          <MoneyField
            label="รายได้เฉลี่ยต่อคนต่อปี ภายหลัง 2 ปี"
            error={errors.incomeAfter2?.message}
            amountValue={values.incomeAfter2}
            {...register("incomeAfter2", { valueAsNumber: true })}
          />
          <MoneyField
            label="รายได้เฉลี่ยต่อคนต่อปี ภายหลัง 3 ปี"
            error={errors.incomeAfter3?.message}
            amountValue={values.incomeAfter3}
            {...register("incomeAfter3", { valueAsNumber: true })}
          />
        </SectionCard>

        {submitError && (
          <p className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-medium text-rose-700">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-12 rounded-lg bg-emerald-600 px-4 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูลครัวเรือน"}
        </button>
      </form>
    </PageContainer>
  );
}
