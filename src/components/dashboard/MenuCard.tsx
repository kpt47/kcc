import Link from "next/link";
import { THEMES } from "@/lib/theme";
import type { DashboardMenuItem } from "@/lib/dashboard";

export function MenuCard({ menu }: { menu: DashboardMenuItem }) {
  const theme = THEMES[menu.theme];
  const Icon = theme.icon;
  return (
    <Link
      href={menu.href}
      className={`group flex flex-col gap-3 rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-4 shadow-sm transition ${theme.cardHoverBorder} hover:shadow-md sm:p-5`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${theme.iconBg}`}>
          <Icon className="h-6 w-6 text-white" aria-hidden />
        </span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${theme.badgeBg} ${theme.badgeText}`}>
          {theme.bookLabel}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className={`text-base font-bold ${theme.headingText}`}>{menu.title}</span>
        <span className="text-sm text-slate-600 dark:text-slate-400">{menu.description}</span>
      </div>
      <span className={`text-sm font-semibold ${theme.headingText} opacity-80 transition group-hover:translate-x-1`}>
        เข้าดูรายการ →
      </span>
    </Link>
  );
}
