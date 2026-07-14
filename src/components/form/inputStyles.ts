import clsx from "clsx";

export function inputClassName(hasError?: boolean, className?: string) {
  return clsx(
    "min-h-12 w-full rounded-lg border px-3.5 py-2.5 text-base text-slate-900 shadow-sm transition placeholder:text-slate-400",
    "dark:text-slate-100 dark:placeholder:text-slate-500",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
    "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500",
    hasError
      ? "border-rose-400 bg-rose-50 dark:border-rose-600 dark:bg-rose-950/40"
      : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900",
    className
  );
}
