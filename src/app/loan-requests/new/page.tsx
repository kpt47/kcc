"use client";

import { useState } from "react";
import { useForm, Controller, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageContainer } from "@/components/layout/PageContainer";
import { WizardShell } from "@/components/wizard/WizardShell";
import { ReviewRow } from "@/components/wizard/ReviewRow";
import { TextField } from "@/components/form/TextField";
import { MoneyField } from "@/components/form/MoneyField";
import { ThaiDateField } from "@/components/form/ThaiDateField";
import { HouseholdSelect, type HouseholdOption } from "@/components/form/HouseholdSelect";
import { loanRequestSchema, LOAN_REQUEST_STEP_FIELDS, type LoanRequestFormValues, type LoanRequestSubmitValues } from "@/lib/schemas";
import { thaiBahtText, calculateAge } from "@/lib/thai";
import { formatThaiDate } from "@/lib/formatDate";
import { LOAN_CEILING_DEFAULT } from "@/lib/config";

const STEPS = [
  { title: "ข้อมูลผู้ขอยืม" },
  { title: "จำนวนเงินที่ขอยืม" },
  { title: "ทบทวนและยืนยัน" },
];

export default function NewLoanRequestPage() {
  const [step, setStep] = useState(0);
  const [selectedHousehold, setSelectedHousehold] = useState<HouseholdOption | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LoanRequestFormValues, unknown, LoanRequestSubmitValues>({
    resolver: zodResolver(loanRequestSchema),
    defaultValues: { agreesToRegulations: false },
  });

  const values = watch();

  // เลือกครัวเรือนแล้ว: เติมอายุปัจจุบัน (คำนวณจากวันเกิดที่บันทึกไว้ในทะเบียนครัวเรือนเป้าหมาย) และอาชีพให้อัตโนมัติ
  // — ยังแก้ไขทับเองได้ตามปกติ เผื่อครัวเรือนยังไม่มีข้อมูลวันเกิด/อาชีพ หรือข้อมูลเปลี่ยนแปลงไปแล้ว
  function handleSelectHousehold(household: HouseholdOption | undefined) {
    setSelectedHousehold(household);
    if (!household) return;
    const age = calculateAge(household.birthDate);
    if (age !== undefined) setValue("applicantAge", age);
    if (household.occupation) setValue("occupation", household.occupation);
  }

  async function goNext() {
    const fieldNames = LOAN_REQUEST_STEP_FIELDS[step] as unknown as Path<LoanRequestFormValues>[];
    const valid = await trigger(fieldNames);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(data: LoanRequestSubmitValues) {
    setSubmitError(null);
    const res = await fetch("/api/loan-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setSubmitError(body?.error?.formErrors?.[0] ?? "บันทึกข้อมูลไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง");
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <PageContainer title="แบบขอยืมเงินทุน">
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-800">
          <p className="text-base font-bold">บันทึกแบบขอยืมเงินทุนเรียบร้อยแล้ว ✓</p>
          <p className="mt-1 text-sm">รอความเห็นพัฒนากรและผลการพิจารณาอนุมัติเงินยืมของคณะกรรมการ กข.คจ. หมู่บ้าน</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="แบบขอยืมเงินทุนของครัวเรือนเป้าหมาย"
      subtitle="ตามโครงการแก้ไขปัญหาความยากจน (กข.คจ.)"
    >
      <WizardShell steps={STEPS} currentStep={step} onBack={goBack} onNext={goNext} onSubmit={handleSubmit(onSubmit)}>
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <Controller
              control={control}
              name="householdId"
              render={({ field }) => (
                <HouseholdSelect
                  label="1. ข้าพเจ้า (ครัวเรือนเป้าหมาย)"
                  required
                  error={errors.householdId?.message}
                  value={field.value}
                  onChange={field.onChange}
                  onSelectHousehold={handleSelectHousehold}
                />
              )}
            />
            {selectedHousehold && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                บ้านเลขที่ {selectedHousehold.houseNo ?? "-"} หมู่ {selectedHousehold.village.villageNo} บ้าน
                {selectedHousehold.village.villageName} ต.{selectedHousehold.village.subDistrict.name} อ.
                {selectedHousehold.village.subDistrict.district.name} จ.
                {selectedHousehold.village.subDistrict.district.province.name}
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="เล่มที่" error={errors.volumeNo?.message} {...register("volumeNo")} />
              <TextField label="เลขที่" error={errors.requestNo?.message} {...register("requestNo")} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="อายุ (ปี)"
                required
                type="number"
                inputMode="numeric"
                error={errors.applicantAge?.message}
                {...register("applicantAge", { valueAsNumber: true })}
              />
              <TextField label="อาชีพ" required error={errors.occupation?.message} {...register("occupation")} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              เพดานวงเงินขอยืมต่อครั้ง (ค่าเริ่มต้น): {LOAN_CEILING_DEFAULT.toLocaleString("th-TH")} บาท — ปรับได้ตามมติคณะกรรมการ
              กข.คจ. หมู่บ้านและงบประมาณคงเหลือจริง
            </p>
            <MoneyField
              label="2. มีความประสงค์จะขอยืมเงินทุน เป็นเงินทั้งสิ้น (บาท)"
              required
              max={LOAN_CEILING_DEFAULT}
              error={errors.requestedAmount?.message}
              amountValue={values.requestedAmount}
              {...register("requestedAmount", { valueAsNumber: true })}
            />

            <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                {...register("agreesToRegulations")}
              />
              <span className="text-sm text-slate-700">
                3. ข้าพเจ้าจะปฏิบัติตามระเบียบกระทรวงมหาดไทยว่าด้วยการบริหารและการใช้จ่ายเงินโครงการแก้ไขปัญหาความยากจน (กข.คจ.)
                ทุกประการ
              </span>
            </label>
            {errors.agreesToRegulations && (
              <p className="text-xs font-medium text-rose-600">{errors.agreesToRegulations.message}</p>
            )}

            <TextField
              label="ชื่อภรรยา/สามี/ทายาท ผู้ให้คำยินยอม"
              error={errors.spouseConsentName?.message}
              {...register("spouseConsentName")}
            />

            <Controller
              control={control}
              name="requestDate"
              render={({ field }) => (
                <ThaiDateField
                  label="วันที่ยื่นคำขอ"
                  required
                  error={errors.requestDate?.message}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-5">
            <section>
              <h3 className="mb-1 text-sm font-bold text-slate-700">ผู้ขอยืม</h3>
              <dl>
                <ReviewRow
                  label="ครัวเรือนเป้าหมาย"
                  value={selectedHousehold ? `${selectedHousehold.headFirstName} ${selectedHousehold.headLastName}` : undefined}
                />
                <ReviewRow label="อายุ" value={values.applicantAge ? `${values.applicantAge} ปี` : undefined} />
                <ReviewRow label="อาชีพ" value={values.occupation} />
              </dl>
            </section>
            <section>
              <h3 className="mb-1 text-sm font-bold text-slate-700">จำนวนเงินที่ขอยืม</h3>
              <dl>
                <ReviewRow
                  label="จำนวนเงิน"
                  value={
                    values.requestedAmount
                      ? `${values.requestedAmount.toLocaleString("th-TH")} บาท (${thaiBahtText(values.requestedAmount)})`
                      : undefined
                  }
                />
                <ReviewRow label="ผู้ให้คำยินยอม" value={values.spouseConsentName} />
                <ReviewRow label="วันที่ยื่นคำขอ" value={formatThaiDate(values.requestDate)} />
              </dl>
            </section>
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">
              หลังบันทึกแล้ว พัฒนากรจะเป็นผู้ให้ความเห็น และประธานคณะกรรมการหมู่บ้านจะเป็นผู้พิจารณาอนุมัติในภายหลัง
            </p>
            {submitError && (
              <p className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-medium text-rose-700">
                {submitError}
              </p>
            )}
          </div>
        )}
      </WizardShell>
    </PageContainer>
  );
}
