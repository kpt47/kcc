import Link from "next/link";
import { MenuCard } from "@/components/dashboard/MenuCard";
import { HouseholdDashboard } from "@/components/dashboard/HouseholdDashboard";
import { menusForRole, ROLES } from "@/lib/dashboard";
import { requireUser, COMMITTEE_ROLE_LABELS } from "@/lib/auth";

export const dynamic = "force-dynamic";

const QUICK_ACTIONS = [
  { href: "/households/new", label: "+ ลงทะเบียนครัวเรือนใหม่" },
  { href: "/proposals", label: "แบบเสนอโครงการ (พิมพ์ PDF)" },
  { href: "/loan-requests", label: "แบบขอยืมเงินทุน (พิมพ์ PDF)" },
];

export default async function Home() {
  const user = await requireUser();
  const role = user.role;
  const roleLabel = ROLES.find((r) => r.id === role)?.label ?? role;
  const committeeRoleLabel = user.committeeRole ? COMMITTEE_ROLE_LABELS[user.committeeRole] : null;
  const menus = menusForRole(user);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:max-w-5xl">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">โครงการแก้ไขปัญหาความยากจน</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">ระบบ กข.คจ.</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {user.displayName} · {roleLabel}
          {committeeRoleLabel ? ` (${committeeRoleLabel})` : ""}
        </p>
      </div>

      {role === "HOUSEHOLD" ? (
        <HouseholdDashboard user={user} />
      ) : role === "IT_SUPPORT" ? (
        <div className="flex flex-col gap-2">
          <Link
            href="/users"
            className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:text-blue-400"
          >
            จัดการผู้ใช้งาน
          </Link>
          <Link
            href="/admin/audit-logs"
            className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:text-blue-400"
          >
            Audit Logs
          </Link>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            บัญชีผู้ดูแลระบบ (IT_SUPPORT) ไม่มีสิทธิ์เข้าถึงข้อมูลสมุดทะเบียนโครงการ กข.คจ. เล่มใดเลย
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {menus.map((menu) => (
              <MenuCard key={menu.key} menu={menu} />
            ))}
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200 pt-5 dark:border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              งานที่ทำบ่อย
            </span>
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:text-blue-400"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
