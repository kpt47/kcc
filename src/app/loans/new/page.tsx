"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageContainer } from "@/components/layout/PageContainer";
import { TextField } from "@/components/form/TextField";
import { MoneyField } from "@/components/form/MoneyField";
import { ThaiDateField } from "@/components/form/ThaiDateField";
import { HouseholdSelect } from "@/components/form/HouseholdSelect";
import { newLoanSchema, type NewLoanFormValues } from "@/lib/schemas";

type BankAccountOption = {
  id: number;
  bankName: string | null;
  branch: string | null;
  accountNo: string | null;
  balance: number;
};

type PendingLoanRequest = {
  loanRequestId: number | null;
  suggestedAmount?: number;
  suggestedOccupation?: string | null;
  suggestedDueDate?: string | null;
  suggestedBorrowRound: number;
  bankAccounts: BankAccountOption[];
};

export default function NewLoanPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState<PendingLoanRequest | null>(null);
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NewLoanFormValues>({ resolver: zodResolver(newLoanSchema) });

  const values = watch();

  // เลือกครัวเรือนแล้ว: ค้นหาแบบขอยืมเงินทุน (ฟอร์ม 2) ที่อนุมัติแล้วและยังไม่ได้ทำสัญญาของครัวเรือนนี้ ถ้ามีให้
  // เติมจำนวนเงิน/อาชีพ/วันครบกำหนดชำระและผูกสัญญากับแบบขอยืมเงินทุนนั้นอัตโนมัติ พร้อมเสนอลำดับที่ยืมถัดไป
  async function handleSelectHouseholdId(id: number | undefined) {
    setValue("householdId", id as number);
    setValue("loanRequestId", undefined);
    setValue("bankAccountId", undefined);
    setPending(null);
    if (!id) return;
    const res = await fetch(`/api/loan-requests/pending-for-loan?householdId=${id}`);
    if (!res.ok) return;
    const data: PendingLoanRequest = await res.json();
    setPending(data);
    setValue("borrowRound", data.suggestedBorrowRound);
    if (data.bankAccounts.length === 1) setValue("bankAccountId", data.bankAccounts[0].id);
    if (data.loanRequestId) {
      setValue("loanRequestId", data.loanRequestId);
      if (data.suggestedAmount != null) setValue("amount", data.suggestedAmount);
      if (data.suggestedOccupation) setValue("occupation", data.suggestedOccupation);
      if (data.suggestedDueDate) setValue("dueDate", data.suggestedDueDate.slice(0, 10));
    }
  }

  async function onSubmit(data: NewLoanFormValues) {
    setSubmitError(null);
    const res = await fetch("/api/loans", {
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
    router.refresh();
  }

  if (success) {
    return (
      <PageContainer title="บัญชีคุมลูกหนี้" backHref="/loans">
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-800">
          <p className="text-base font-bold">บันทึกรายการยืมเงินเรียบร้อยแล้ว ✓</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="บันทึกรายการยืมเงินใหม่" subtitle="บัญชีคุมลูกหนี้ (เล่มเหลือง)" backHref="/loans">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <Controller
          control={control}
          name="householdId"
          render={({ field }) => (
            <HouseholdSelect
              label="ครัวเรือนเป้าหมาย"
              required
              error={errors.householdId?.message}
              value={field.value}
              onChange={handleSelectHouseholdId}
            />
          )}
        />
        {pending?.loanRequestId && (
          <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">
            พบแบบขอยืมเงินทุนที่อนุมัติแล้วของครัวเรือนนี้ — เติมจำนวนเงิน/อาชีพ/วันครบกำหนดชำระให้อัตโนมัติ และจะผูกสัญญานี้กับแบบขอยืมเงินทุนดังกล่าว
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="ยืมครั้งที่"
            required
            type="number"
            inputMode="numeric"
            error={errors.borrowRound?.message}
            {...register("borrowRound", { valueAsNumber: true })}
          />
          <TextField label="เลขที่สัญญา" error={errors.contractNo?.message} {...register("contractNo")} />
        </div>
        <MoneyField
          label="จำนวนเงินยืม (บาท)"
          required
          error={errors.amount?.message}
          amountValue={values.amount}
          {...register("amount", { valueAsNumber: true })}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="receivedDate"
            render={({ field }) => (
              <ThaiDateField
                label="วันที่รับเงินยืม"
                required
                error={errors.receivedDate?.message}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="dueDate"
            render={({ field }) => (
              <ThaiDateField label="วันครบกำหนดชำระ" value={field.value} onChange={field.onChange} />
            )}
          />
        </div>
        <TextField label="อาชีพที่นำเงินไปลงทุน" error={errors.occupation?.message} {...register("occupation")} />

        {pending && pending.bankAccounts.length > 1 && (
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              บัญชีธนาคารที่จะถอนเงินจ่าย <span className="text-rose-600">*</span>
            </label>
            <select
              className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
              value={values.bankAccountId ?? ""}
              onChange={(e) => setValue("bankAccountId", e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">-- เลือกบัญชีธนาคาร --</option>
              {pending.bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.bankName ?? "ไม่ระบุธนาคาร"} {a.branch ? `สาขา${a.branch} ` : ""}
                  {a.accountNo ?? ""} — คงเหลือ {a.balance.toLocaleString("th-TH")} บาท
                </option>
              ))}
            </select>
            {errors.bankAccountId && <p className="mt-1 text-xs text-rose-600">{errors.bankAccountId.message}</p>}
          </div>
        )}
        {pending && pending.bankAccounts.length === 1 && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
            จะถอนเงินจากบัญชี {pending.bankAccounts[0].bankName ?? "ไม่ระบุธนาคาร"}{" "}
            {pending.bankAccounts[0].accountNo ?? ""} (คงเหลือ {pending.bankAccounts[0].balance.toLocaleString("th-TH")} บาท) ให้อัตโนมัติ
          </p>
        )}
        {(() => {
          const selected = pending?.bankAccounts.find((a) => a.id === values.bankAccountId);
          return selected && values.amount > selected.balance ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              ยอดเงินยืมเกินยอดคงเหลือในบัญชีที่เลือก (คงเหลือ {selected.balance.toLocaleString("th-TH")} บาท)
            </p>
          ) : null;
        })()}

        {submitError && <p className="text-sm font-medium text-rose-600">{submitError}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-11 rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
        >
          {isSubmitting ? "กำลังบันทึก..." : "บันทึกรายการยืมเงิน"}
        </button>
      </form>
    </PageContainer>
  );
}
