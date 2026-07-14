import Link from "next/link";
import { ReactNode } from "react";

export function PageContainer({
  title,
  subtitle,
  backHref = "/",
  children,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6 lg:max-w-5xl">
      <div className="flex flex-col gap-1">
        <Link
          href={backHref}
          className="inline-flex min-h-11 w-fit items-center px-1 text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
        >
          ← กลับหน้าหลัก
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">{title}</h1>
        {subtitle && <p className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </main>
  );
}

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">{title}</h2>
        {description && <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {children}
    </section>
  );
}
