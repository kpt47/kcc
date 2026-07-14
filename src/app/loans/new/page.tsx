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

export default function NewLoanPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<NewLoanFormValues>({ resolver: zodResolver(newLoanSchema) });

  const values = watch();

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
              onChange={field.onChange}
            />
          )}
        />
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
