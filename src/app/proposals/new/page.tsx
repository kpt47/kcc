"use client";

import { useState } from "react";
import { useForm, Controller, useFieldArray, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageContainer } from "@/components/layout/PageContainer";
import { WizardShell } from "@/components/wizard/WizardShell";
import { ReviewRow } from "@/components/wizard/ReviewRow";
import { TextField } from "@/components/form/TextField";
import { MoneyField } from "@/components/form/MoneyField";
import { ThaiDateField } from "@/components/form/ThaiDateField";
import { HouseholdSelect, type HouseholdOption } from "@/components/form/HouseholdSelect";
import { proposalSchema, PROPOSAL_STEP_FIELDS, type ProposalFormValues, type ProposalSubmitValues } from "@/lib/schemas";
import { thaiBahtText, calculateAge } from "@/lib/thai";
import { formatThaiDate } from "@/lib/formatDate";

const STEPS = [
  { title: "ผู้เสนอโครงการ" },
  { title: "รายละเอียดโครงการ" },
  { title: "ทบทวนและยืนยัน" },
];

export default function NewProposalPage() {
  const [step, setStep] = useState(0);
  const [selectedHousehold, setSelectedHousehold] = useState<HouseholdOption | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdNumbers, setCreatedNumbers] = useState<{ volumeNo: number | null; proposalNo: number | null } | null>(
    null
  );

  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProposalFormValues, unknown, ProposalSubmitValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: { items: [{ description: "", amount: undefined }] },
  });

  // เลือกครัวเรือนแล้ว: เติมอายุปัจจุบัน (คำนวณจากวันเกิดที่บันทึกไว้ในทะเบียนครัวเรือนเป้าหมาย) และอาชีพให้อัตโนมัติ
  // — ยังแก้ไขทับเองได้ตามปกติ เผื่อครัวเรือนยังไม่มีข้อมูลวันเกิด/อาชีพ หรือข้อมูลเปลี่ยนแปลงไปแล้ว
  function handleSelectHousehold(household: HouseholdOption | undefined) {
    setSelectedHousehold(household);
    if (!household) return;
    const age = calculateAge(household.birthDate);
    if (age !== undefined) setValue("applicantAge", age);
    if (household.occupation) setValue("occupation", household.occupation);
  }

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const values = watch();

  const itemsRootError =
    (errors.items && "message" in errors.items && typeof errors.items.message === "string" && errors.items.message) ||
    errors.items?.root?.message;

  async function goNext() {
    const fieldNames = PROPOSAL_STEP_FIELDS[step] as unknown as Path<ProposalFormValues>[];
    const valid = await trigger(fieldNames);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(data: ProposalSubmitValues) {
    setSubmitError(null);
    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setSubmitError(body?.error?.formErrors?.[0] ?? "บันทึกข้อมูลไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง");
      return;
    }
    const created = await res.json();
    setCreatedNumbers({ volumeNo: created.volumeNo, proposalNo: created.proposalNo });
    setSuccess(true);
  }

  if (success) {
    return (
      <PageContainer title="แบบเสนอโครงการ">
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-800">
          <p className="text-base font-bold">บันทึกแบบเสนอโครงการเรียบร้อยแล้ว ✓</p>
          {createdNumbers && (
            <p className="mt-1 text-sm">
              เล่มที่ {createdNumbers.volumeNo} โครงการที่ {createdNumbers.proposalNo}
            </p>
          )}
          <p className="mt-1 text-sm">รอความเห็นพัฒนากรและผลการพิจารณาของคณะกรรมการ กข.คจ. หมู่บ้าน</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="แบบเสนอโครงการของครัวเรือนเป้าหมาย"
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
                  label="1. ผู้เสนอโครงการ (ครัวเรือนเป้าหมาย)"
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
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
              ระบบจะกำหนดเล่มที่และโครงการที่ให้อัตโนมัติเมื่อบันทึกข้อมูล
            </p>
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
            <TextField
              label="2. เสนอโครงการ (ชื่อโครงการ)"
              required
              placeholder="เช่น เลี้ยงโคขุน, ปลูกพืชผักสวนครัว"
              error={errors.projectName?.message}
              {...register("projectName")}
            />
            <MoneyField
              label="เป็นเงินทั้งสิ้น (บาท)"
              required
              error={errors.totalAmount?.message}
              amountValue={values.totalAmount}
              {...register("totalAmount", { valueAsNumber: true })}
            />

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  รายการที่นำเงินไปดำเนินการ <span className="text-rose-600">*</span>
                </p>
                <button
                  type="button"
                  onClick={() => append({ description: "", amount: undefined as unknown as number })}
                  className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-emerald-700 hover:underline"
                >
                  + เพิ่มรายการ
                </button>
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2 rounded-lg border border-slate-200 p-3">
                  <span className="mt-3 text-sm font-semibold text-slate-400">2.{index + 1}</span>
                  <div className="flex flex-1 flex-col gap-2">
                    <TextField
                      label="รายการ"
                      error={errors.items?.[index]?.description?.message}
                      {...register(`items.${index}.description` as const)}
                    />
                    <MoneyField
                      label="เป็นเงิน (บาท)"
                      error={errors.items?.[index]?.amount?.message}
                      amountValue={values.items?.[index]?.amount}
                      {...register(`items.${index}.amount` as const, { valueAsNumber: true })}
                    />
                  </div>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      aria-label="ลบรายการนี้"
                      className="mt-1 inline-flex min-h-11 items-center px-2 text-sm font-semibold text-rose-600 hover:underline"
                    >
                      ลบ
                    </button>
                  )}
                </div>
              ))}
              {itemsRootError && <p className="text-xs font-medium text-rose-600">{itemsRootError}</p>}
            </div>

            <Controller
              control={control}
              name="proposedDate"
              render={({ field }) => (
                <ThaiDateField
                  label="วันที่เสนอโครงการ"
                  required
                  error={errors.proposedDate?.message}
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
              <h3 className="mb-1 text-sm font-bold text-slate-700">ผู้เสนอโครงการ</h3>
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
              <h3 className="mb-1 text-sm font-bold text-slate-700">รายละเอียดโครงการ</h3>
              <dl>
                <ReviewRow label="ชื่อโครงการ" value={values.projectName} />
                <ReviewRow
                  label="จำนวนเงินทั้งสิ้น"
                  value={values.totalAmount ? `${values.totalAmount.toLocaleString("th-TH")} บาท (${thaiBahtText(values.totalAmount)})` : undefined}
                />
                <ReviewRow label="วันที่เสนอโครงการ" value={formatThaiDate(values.proposedDate)} />
              </dl>
              <ul className="mt-2 flex flex-col gap-1">
                {values.items?.map((item, i) => (
                  <li key={i} className="flex justify-between text-sm text-slate-600">
                    <span>2.{i + 1} {item.description}</span>
                    <span className="font-semibold">{item.amount ? item.amount.toLocaleString("th-TH") : "-"} บาท</span>
                  </li>
                ))}
              </ul>
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
