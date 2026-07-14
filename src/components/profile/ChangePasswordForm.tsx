"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField } from "@/components/form/TextField";
import { changePasswordSchema, type ChangePasswordFormValues } from "@/lib/schemas";

export function ChangePasswordForm() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(values: ChangePasswordFormValues) {
    setSubmitError(null);
    setSubmitSuccess(false);
    const res = await fetch("/api/user/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const fieldErrors = body?.error?.fieldErrors;
      if (fieldErrors?.oldPassword?.[0]) {
        setError("oldPassword", { message: fieldErrors.oldPassword[0] });
      } else if (fieldErrors?.confirmPassword?.[0]) {
        setError("confirmPassword", { message: fieldErrors.confirmPassword[0] });
      } else if (fieldErrors?.newPassword?.[0]) {
        setError("newPassword", { message: fieldErrors.newPassword[0] });
      } else {
        setSubmitError(body?.error?.formErrors?.[0] ?? "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่");
      }
      return;
    }
    reset();
    setSubmitSuccess(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <TextField
        label="รหัสผ่านเดิม"
        type="password"
        required
        error={errors.oldPassword?.message}
        {...register("oldPassword")}
      />
      <TextField
        label="รหัสผ่านใหม่"
        type="password"
        required
        hint="อย่างน้อย 8 ตัวอักษร"
        error={errors.newPassword?.message}
        {...register("newPassword")}
      />
      <TextField
        label="ยืนยันรหัสผ่านใหม่"
        type="password"
        required
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      {submitError && <p className="text-sm font-medium text-rose-600">{submitError}</p>}
      {submitSuccess && <p className="text-sm font-medium text-emerald-600">เปลี่ยนรหัสผ่านสำเร็จแล้ว</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-11 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {isSubmitting ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
      </button>
    </form>
  );
}
