"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField } from "@/components/form/TextField";
import {
  forgotPasswordRequestSchema,
  resetPasswordWithOtpSchema,
  type ForgotPasswordRequestValues,
  type ResetPasswordWithOtpValues,
} from "@/lib/schemas";

// หน้ากู้คืนรหัสผ่านด้วย OTP ทางอีเมล (Self-Service) — 2 ขั้นตอน:
// (1) กรอก username+email -> ระบบส่ง OTP ไปยังอีเมล (แสดงข้อความสำเร็จทั่วไปเสมอ ไม่บอกว่าพบผู้ใช้จริงหรือไม่)
// (2) กรอก OTP + รหัสผ่านใหม่ -> ตั้งรหัสผ่านใหม่สำเร็จ -> กลับไปหน้า /login
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [username, setUsername] = useState("");
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const requestForm = useForm<ForgotPasswordRequestValues>({ resolver: zodResolver(forgotPasswordRequestSchema) });
  const resetForm = useForm<ResetPasswordWithOtpValues>({ resolver: zodResolver(resetPasswordWithOtpSchema) });

  async function onRequestSubmit(values: ForgotPasswordRequestValues) {
    setSubmitError(null);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setSubmitError(body?.error?.formErrors?.[0] ?? "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่");
      return;
    }
    setUsername(values.username);
    setRequestMessage(body?.message ?? "ส่งรหัส OTP เรียบร้อยแล้ว");
    resetForm.setValue("username", values.username);
    setStep("reset");
  }

  async function onResetSubmit(values: ResetPasswordWithOtpValues) {
    setSubmitError(null);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setSubmitError(body?.error?.formErrors?.[0] ?? "ตั้งรหัสผ่านใหม่ไม่สำเร็จ");
      return;
    }
    router.push("/login");
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1 text-center">
        <p className="text-sm font-semibold text-blue-700">โครงการแก้ไขปัญหาความยากจน</p>
        <h1 className="text-2xl font-bold text-slate-900">กู้คืนรหัสผ่าน</h1>
        <p className="text-sm text-slate-600">
          {step === "request" ? "กรอกชื่อผู้ใช้และอีเมลที่ผูกกับบัญชีของคุณ" : "กรอกรหัส OTP ที่ได้รับทางอีเมลและตั้งรหัสผ่านใหม่"}
        </p>
      </div>

      {step === "request" ? (
        <form
          onSubmit={requestForm.handleSubmit(onRequestSubmit)}
          className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <TextField
            label="ชื่อผู้ใช้"
            required
            error={requestForm.formState.errors.username?.message}
            {...requestForm.register("username")}
          />
          <TextField
            label="อีเมล"
            type="email"
            required
            error={requestForm.formState.errors.email?.message}
            {...requestForm.register("email")}
          />
          {submitError && <p className="text-sm font-medium text-rose-600">{submitError}</p>}
          <button
            type="submit"
            disabled={requestForm.formState.isSubmitting}
            className="min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            {requestForm.formState.isSubmitting ? "กำลังส่ง..." : "ส่งรหัส OTP"}
          </button>
          <Link href="/login" className="text-center text-sm font-medium text-slate-500 hover:underline">
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </form>
      ) : (
        <form
          onSubmit={resetForm.handleSubmit(onResetSubmit)}
          className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          {requestMessage && (
            <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{requestMessage}</p>
          )}
          <input type="hidden" value={username} {...resetForm.register("username")} />
          <TextField
            label="รหัส OTP (6 หลัก)"
            required
            inputMode="numeric"
            maxLength={6}
            error={resetForm.formState.errors.otp?.message}
            {...resetForm.register("otp")}
          />
          <TextField
            label="รหัสผ่านใหม่"
            type="password"
            required
            error={resetForm.formState.errors.newPassword?.message}
            {...resetForm.register("newPassword")}
          />
          <TextField
            label="ยืนยันรหัสผ่านใหม่"
            type="password"
            required
            error={resetForm.formState.errors.confirmPassword?.message}
            {...resetForm.register("confirmPassword")}
          />
          {submitError && <p className="text-sm font-medium text-rose-600">{submitError}</p>}
          <button
            type="submit"
            disabled={resetForm.formState.isSubmitting}
            className="min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            {resetForm.formState.isSubmitting ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}
          </button>
          <button
            type="button"
            onClick={() => setStep("request")}
            className="text-center text-sm font-medium text-slate-500 hover:underline"
          >
            ยังไม่ได้รับ OTP? ย้อนกลับ
          </button>
        </form>
      )}
    </main>
  );
}
