"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { LOAN_CEILING_DEFAULT, MAX_REPAYMENT_YEARS } from "@/lib/config";
import { alertDialog, confirmDialog } from "@/lib/confirmDialog";
import { computeRepaymentDueDate, computeMonthlyInstallment, monthsBetween } from "@/lib/loanSchedule";

const STEPS = [
  { title: "ข้อมูลผู้ขอยืม" },
  { title: "จำนวนเงินที่ขอยืม" },
  { title: "ทบทวนและยืนยัน" },
];

type LinkedProposal = {
  id: number;
  householdId: number;
  volumeNo: number | null;
  proposalNo: number | null;
  committeeAmount: number | null;
  applicantAge: number;
  occupation: string;
  consentPersonName: string | null;
};

export default function NewLoanRequestPage() {
  return (
    <Suspense>
      <NewLoanRequestForm />
    </Suspense>
  );
}

function NewLoanRequestForm() {
  const searchParams = useSearchParams();
  const proposalIdParam = searchParams.get("proposalId");

  const [step, setStep] = useState(0);
  const [selectedHousehold, setSelectedHousehold] = useState<HouseholdOption | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdNumbers, setCreatedNumbers] = useState<{ volumeNo: number | null; requestNo: number | null } | null>(
    null
  );
  const [linkedProposal, setLinkedProposal] = useState<LinkedProposal | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  // true จนกว่าจะรู้แน่ชัดว่ามีแบบเสนอโครงการที่อนุมัติแล้วมาอ้างอิงหรือไม่ — กันไม่ให้กรอกยอดขอยืมได้ก่อนรู้ผล
  // (ไม่งั้นจะมีช่วงเวลาสั้นๆ ที่พิมพ์ยอดเกินวงเงินจริงได้ก่อนที่ระบบจะโหลดข้อมูลวงเงินที่อนุมัติมาจำกัดทัน)
  const [checkingProposalLink, setCheckingProposalLink] = useState(true);
  // วันครบกำหนดชำระเงินทั้งหมด: ค่าเริ่มต้นตามวันที่ยื่นคำขอ (+MAX_REPAYMENT_YEARS) แต่ครัวเรือนแก้ไขเองได้ —
  // เมื่อแก้เองแล้วครั้งหนึ่ง จะไม่ auto-update ตามวันที่ยื่นคำขอที่เปลี่ยนภายหลังอีก (เคารพค่าที่เลือกเอง)
  const [dueDateTouched, setDueDateTouched] = useState(false);

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

  const requestedAmountField = register("requestedAmount", { valueAsNumber: true });

  const values = watch();
  const amountCeiling =
    linkedProposal?.committeeAmount != null
      ? Math.min(LOAN_CEILING_DEFAULT, linkedProposal.committeeAmount)
      : LOAN_CEILING_DEFAULT;

  // ยอดชำระต่อเดือน (โดยประมาณ) เป็นค่าคำนวณอัตโนมัติเสมอ — มาจากวันที่ยื่นคำขอ, วันครบกำหนดชำระที่ครัวเรือน
  // กรอกเอง (หรือค่าเริ่มต้นที่ยังไม่ได้แก้ไข) และจำนวนเงินที่ขอยืม ไม่ให้แก้ไขค่านี้ตรงๆ
  const requestDateObj = values.requestDate ? new Date(values.requestDate) : null;
  const dueDateObj = values.repaymentDueDate ? new Date(values.repaymentDueDate) : null;
  const repaymentPreview =
    requestDateObj && dueDateObj && values.requestedAmount > 0
      ? {
          months: monthsBetween(requestDateObj, dueDateObj),
          monthlyInstallment: computeMonthlyInstallment(values.requestedAmount, requestDateObj, dueDateObj),
        }
      : null;

  // ตรวจสอบยอดขอยืมเทียบกับวงเงินที่ประธานกรรมการอนุมัติไว้ในแบบเสนอโครงการที่อ้างอิง — เรียกทั้งตอนออกจากช่อง
  // จำนวนเงิน (onBlur) และตอนกดถัดไป เพื่อให้เตือนทันทีไม่ต้องรอเปลี่ยนหน้าก่อน
  async function checkAmountAgainstCeiling(): Promise<boolean> {
    if (!linkedProposal?.committeeAmount) return true;
    const amount = values.requestedAmount;
    if (!amount) return true;
    const ceiling = linkedProposal.committeeAmount;
    if (amount > ceiling) {
      await alertDialog({
        title: "วงเงินเกินกว่าที่อนุมัติ",
        text: `วงเงินที่กรอก (${amount.toLocaleString("th-TH")} บาท) เกินกว่าวงเงินที่ประธานกรรมการอนุมัติไว้ในแบบเสนอโครงการนี้ (${ceiling.toLocaleString("th-TH")} บาท) กรุณาแก้ไขจำนวนเงินก่อนดำเนินการต่อ`,
        tone: "danger",
      });
      return false;
    }
    if (amount < ceiling) {
      return await confirmDialog({
        title: "ยอดเงินน้อยกว่าที่อนุมัติ",
        text: `วงเงินที่กรอก (${amount.toLocaleString("th-TH")} บาท) น้อยกว่าวงเงินที่ประธานกรรมการอนุมัติไว้ (${ceiling.toLocaleString("th-TH")} บาท) ต้องการดำเนินการต่อด้วยยอดนี้หรือไม่?`,
        confirmButtonText: "ดำเนินการต่อ",
      });
    }
    return true;
  }

  // ยื่นผ่านลิงก์ในการแจ้งเตือนอนุมัติแบบเสนอโครงการ (?proposalId=...) — ดึงเล่มที่/โครงการที่/วงเงินที่อนุมัติ
  // และผู้ให้ความยินยอมของครัวเรือนนั้นมาเติมให้อัตโนมัติ ไม่ต้องกรอกซ้ำ
  //
  // ถ้าไม่มี proposalId ในลิงก์ (เช่น พลาดกดแจ้งเตือน หรือกดทำเครื่องหมายอ่านแล้วไปก่อน) ให้ตรวจสอบเองว่าครัวเรือน
  // นี้มีแบบเสนอโครงการที่อนุมัติแล้วแต่ยังไม่ได้ใช้ยื่นค้างอยู่หรือไม่ (ดู /api/proposals/pending-loan-link) แล้ว
  // อ้างอิงให้อัตโนมัติเหมือนกัน — เพื่อให้เพดานวงเงินตามที่ประธานอนุมัติมีผลบังคับใช้เสมอ ไม่ขึ้นกับว่าคลิกลิงก์
  // แจ้งเตือนหรือไม่ (ต่างจากตอนมี proposalId ชัดเจน: ที่นี่ไม่ error ถ้าไม่พบ ปล่อยให้ยื่นแบบอิสระตามปกติ)
  useEffect(() => {
    let cancelled = false;
    const url = proposalIdParam ? `/api/proposals/${proposalIdParam}` : "/api/proposals/pending-loan-link";
    fetch(url)
      .then(async (res) => {
        if (proposalIdParam && !res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error?.formErrors?.[0] ?? "ไม่สามารถโหลดข้อมูลแบบเสนอโครงการที่อ้างอิงได้");
        }
        return res.json();
      })
      .then((data: LinkedProposal | null) => {
        if (cancelled) return;
        if (data) {
          setLinkedProposal(data);
          setValue("householdId", data.householdId);
          setValue("applicantAge", data.applicantAge);
          setValue("occupation", data.occupation);
          if (data.consentPersonName) setValue("spouseConsentName", data.consentPersonName);
        }
      })
      .catch((err: Error) => {
        if (!cancelled && proposalIdParam) setLinkError(err.message);
      })
      .finally(() => {
        if (!cancelled) setCheckingProposalLink(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalIdParam]);

  // เลือกครัวเรือนแล้ว: เติมอายุปัจจุบัน (คำนวณจากวันเกิดที่บันทึกไว้ในทะเบียนครัวเรือนเป้าหมาย) อาชีพ และผู้ให้
  // ความยินยอม (จากสัญญายืมเงินครั้งก่อน ถ้ามี) ให้อัตโนมัติ — ยังแก้ไขทับเองได้ตามปกติ
  function handleSelectHousehold(household: HouseholdOption | undefined) {
    setSelectedHousehold(household);
    if (!household) return;
    const age = calculateAge(household.birthDate);
    if (age !== undefined) setValue("applicantAge", age);
    if (household.occupation) setValue("occupation", household.occupation);
    if (household.consentPersonName) setValue("spouseConsentName", household.consentPersonName);
  }

  async function goNext() {
    const fieldNames = LOAN_REQUEST_STEP_FIELDS[step] as unknown as Path<LoanRequestFormValues>[];
    const valid = await trigger(fieldNames);
    if (!valid) return;

    if (step === 1) {
      const ok = await checkAmountAgainstCeiling();
      if (!ok) return;
    }

    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(data: LoanRequestSubmitValues) {
    setSubmitError(null);
    const res = await fetch("/api/loan-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, proposalId: linkedProposal?.id }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setSubmitError(
        body?.error?.formErrors?.[0] ?? body?.error?.fieldErrors?.requestedAmount?.[0] ?? "บันทึกข้อมูลไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง"
      );
      return;
    }
    const created = await res.json();
    setCreatedNumbers({ volumeNo: created.volumeNo, requestNo: created.requestNo });
    setSuccess(true);
  }

  if (success) {
    return (
      <PageContainer title="แบบขอยืมเงินทุน">
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-800">
          <p className="text-base font-bold">บันทึกแบบขอยืมเงินทุนเรียบร้อยแล้ว ✓</p>
          {createdNumbers && (
            <p className="mt-1 text-sm">
              เล่มที่ {createdNumbers.volumeNo} เลขที่ {createdNumbers.requestNo}
            </p>
          )}
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
      {linkedProposal && (
        <p className="mb-4 rounded-lg bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">
          อ้างอิงแบบเสนอโครงการ เล่มที่ {linkedProposal.volumeNo} โครงการที่ {linkedProposal.proposalNo}
          {linkedProposal.committeeAmount != null &&
            ` — วงเงินที่ประธานกรรมการอนุมัติ: ${linkedProposal.committeeAmount.toLocaleString("th-TH")} บาท`}
        </p>
      )}
      {linkError && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{linkError}</p>
      )}
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
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
              ระบบจะกำหนดเล่มที่และเลขที่ให้อัตโนมัติเมื่อบันทึกข้อมูล
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
            {checkingProposalLink ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
                กำลังตรวจสอบวงเงินที่อนุมัติจากแบบเสนอโครงการ...
              </p>
            ) : (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                เพดานวงเงินขอยืมต่อครั้ง: {amountCeiling.toLocaleString("th-TH")} บาท
                {linkedProposal?.committeeAmount != null
                  ? " — จำกัดตามวงเงินที่ประธานกรรมการอนุมัติในแบบเสนอโครงการ"
                  : " (ค่าเริ่มต้น) — ปรับได้ตามมติคณะกรรมการ กข.คจ. หมู่บ้านและงบประมาณคงเหลือจริง"}
              </p>
            )}
            <MoneyField
              label="2. มีความประสงค์จะขอยืมเงินทุน เป็นเงินทั้งสิ้น (บาท)"
              required
              disabled={checkingProposalLink}
              max={amountCeiling}
              error={errors.requestedAmount?.message}
              amountValue={values.requestedAmount}
              {...requestedAmountField}
              onBlur={(e) => {
                requestedAmountField.onBlur(e);
                checkAmountAgainstCeiling();
              }}
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
                  value={field.value}
                  onChange={(v) => {
                    field.onChange(v);
                    // ยังไม่เคยแก้ไขวันครบกำหนดชำระเอง — ตั้งค่าเริ่มต้นให้ตามวันที่ยื่นคำขอใหม่นี้อัตโนมัติ
                    if (!dueDateTouched && v) {
                      const due = computeRepaymentDueDate(new Date(v));
                      setValue("repaymentDueDate", due.toISOString().slice(0, 10));
                    }
                  }}
                />
              )}
            />

            <TextField
              label="1. ตกลงชำระทุกๆวันที่ ..... ของเดือน จนครบสัญญา (ระบุวันที่ 1-31)"
              required
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              error={errors.paymentDayOfMonth?.message}
              {...register("paymentDayOfMonth", { valueAsNumber: true })}
            />

            <Controller
              control={control}
              name="repaymentDueDate"
              render={({ field }) => (
                <ThaiDateField
                  label="2. วันครบกำหนดชำระเงินทั้งหมด"
                  required
                  hint={`ค่าเริ่มต้น: วันที่ยื่นคำขอ + ${MAX_REPAYMENT_YEARS} ปี — แก้ไขเองได้ตามที่ตกลงกับคณะกรรมการ`}
                  error={errors.repaymentDueDate?.message}
                  toBeYearOffset={MAX_REPAYMENT_YEARS + 1}
                  value={field.value}
                  onChange={(v) => {
                    field.onChange(v);
                    setDueDateTouched(true);
                  }}
                />
              )}
            />

            {repaymentPreview && (
              <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
                <p className="text-sm font-bold text-emerald-800">3. ยอดชำระต่อเดือน (โดยประมาณ) — คำนวณอัตโนมัติ</p>
                <p className="text-2xl font-extrabold text-emerald-900">
                  {repaymentPreview.monthlyInstallment.toLocaleString("th-TH", { maximumFractionDigits: 0 })} บาท/เดือน
                </p>
                <p className="text-xs text-emerald-700">เป็นเวลา {repaymentPreview.months} เดือน นับจากวันที่ยื่นคำขอ</p>
              </div>
            )}
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
                <ReviewRow
                  label="ตกลงชำระทุกๆวันที่"
                  value={values.paymentDayOfMonth ? `วันที่ ${values.paymentDayOfMonth} ของทุกเดือน` : undefined}
                />
                <ReviewRow label="วันครบกำหนดชำระเงินทั้งหมด" value={formatThaiDate(values.repaymentDueDate)} />
                {repaymentPreview && (
                  <ReviewRow
                    label="ยอดชำระต่อเดือน (โดยประมาณ)"
                    value={`${repaymentPreview.monthlyInstallment.toLocaleString("th-TH", { maximumFractionDigits: 0 })} บาท (${repaymentPreview.months} เดือน)`}
                  />
                )}
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
