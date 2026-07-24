"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";
import { Mail, Phone, Printer } from "lucide-react";
import { TextField } from "@/components/form/TextField";
import { loginSchema, type LoginFormValues } from "@/lib/schemas";
import { BRAND, BRAND_ALT } from "@/lib/branding";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function LoginPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setSubmitError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, captchaToken }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setSubmitError(body?.error?.formErrors?.[0] ?? "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <img src={BRAND.sealsRow} alt={BRAND_ALT.sealsRow} className="h-16 w-auto sm:h-20" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">โครงการแก้ไขปัญหาความยากจน</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">ระบบ กข.คจ.</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">เข้าสู่ระบบเพื่อดำเนินการต่อ</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <TextField label="ชื่อผู้ใช้" required error={errors.username?.message} {...register("username")} />
        <TextField
          label="รหัสผ่าน"
          type="password"
          required
          error={errors.password?.message}
          {...register("password")}
        />
        {TURNSTILE_SITE_KEY && (
          <Turnstile siteKey={TURNSTILE_SITE_KEY} onSuccess={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />
        )}
        {submitError && <p className="text-sm font-medium text-rose-600">{submitError}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
        >
          {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
        <Link
          href="/forgot-password"
          className="text-center text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
        >
          ลืมรหัสผ่าน (Forgot Password)
        </Link>
      </form>

      <footer className="flex flex-col items-center gap-1.5 border-t border-slate-200 pt-5 text-center text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <p className="font-semibold text-slate-600 dark:text-slate-300">สำนักพัฒนาทุนและองค์กรการเงินชุมชน</p>
        <p>กรมการพัฒนาชุมชน กระทรวงมหาดไทย</p>
        <p>
          ศูนย์ราชการเฉลิมพระเกียรติฯ อาคารรัฐประศาสนภักดี (อาคาร B)
          <br />
          ชั้น 3 ถนนแจ้งวัฒนะ หลักสี่ กรุงเทพฯ 10210
        </p>
        <div className="mt-1 flex flex-col items-center gap-1">
          <span className="inline-flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 shrink-0" /> fund@cdd.mail.go.th
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 shrink-0" /> 0-2141-6315, 0-2141-6374
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Printer className="h-3.5 w-3.5 shrink-0" /> 0-2143-8908, 0-2143-8909
          </span>
        </div>
      </footer>
    </main>
  );
}
