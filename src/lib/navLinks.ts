// รายการเมนูนำทางแบบรวมศูนย์ (ใช้ร่วมกันทั้ง Sidebar เดสก์ท็อป, Bottom Navigation มือถือ, และเมนู Hamburger)
// เพื่อไม่ให้ตรรกะการซ่อน/แสดงเมนูตาม role กระจัดกระจายอยู่หลายที่ (เดิมอยู่ใน TopNav.tsx เพียงที่เดียว)
import type { LucideIcon } from "lucide-react";
import {
  Home,
  LayoutDashboard,
  Users,
  Landmark,
  Banknote,
  ClipboardList,
  FileText,
  CalendarCheck,
  MapPin,
  BarChart3,
  UserCog,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { menusForRole } from "./dashboard";
import { hasMinRole } from "./authz";
import type { CurrentUser } from "./auth";

export type NavLink = { href: string; label: string; icon: LucideIcon; iconColor?: string };

// สีไอคอนอ้างอิงสีปกสมุดบัญชีแต่ละเล่ม (ตรงกับ lib/theme.ts) — ใช้ text-* เพราะ Sidebar/BottomNav
// วาดไอคอนแบบ outline (currentColor) ไม่ใช่พื้นหลังทึบแบบ badge ใน MenuCard
// แต่ละค่าแนบ dark: ไว้ในตัวเองแล้ว (โทนพาสเทลอ่อนลงในโหมดมืด) เพื่อให้ทุกจุดที่ใช้ iconColor นี้ต่อ
// (Sidebar, BottomNav, เมนู Hamburger) รองรับ Dark Mode โดยอัตโนมัติ ไม่ต้องเขียนเงื่อนไข dark ซ้ำที่ผู้เรียกใช้
export const BOOK_ICON_COLOR: Record<string, string> = {
  households: "text-violet-600 dark:text-violet-300", // เล่มม่วง
  villages: "text-[#8B5E34] dark:text-[#D2AD7C]", // เล่มน้ำตาล
  "bank-accounts": "text-emerald-600 dark:text-emerald-300", // เล่มเขียว
  loans: "text-amber-600 dark:text-amber-300", // เล่มเหลือง
};

const BOOK_ICONS: Record<string, LucideIcon> = {
  households: Users,
  villages: ClipboardList,
  "bank-accounts": Landmark,
  loans: Banknote,
};

const EXTRA_LINKS: NavLink[] = [
  { href: "/proposals", label: "แบบเสนอโครงการ", icon: FileText },
  { href: "/loan-requests", label: "แบบขอยืมเงินทุน", icon: FileText },
  { href: "/meetings", label: "รายงาน/วาระการประชุม", icon: CalendarCheck },
];

/**
 * คืนรายการเมนูนำทางตาม role ของผู้ใช้ — logic การซ่อน/แสดงต้องตรงกับ lib/authz.ts และ lib/dashboard.ts เป๊ะ
 * (ดู TopNav.tsx เดิมสำหรับที่มาของเงื่อนไขแต่ละอัน): IT_SUPPORT เห็นเฉพาะจัดการผู้ใช้งาน+Audit Log,
 * HOUSEHOLD เห็นเฉพาะ 2 เมนูข้อมูลของตนเอง (เล่มม่วง/เหลือง), role อื่นเห็นเมนูเต็มตามสิทธิ์ของตน
 */
export function getNavLinks(user: CurrentUser): NavLink[] {
  const role = user.role;
  const isUserManager =
    role !== "HOUSEHOLD" &&
    (role !== "VILLAGE_COMMITTEE" || user.committeeRole === "CHAIRMAN" || user.committeeRole === "SECRETARY");

  if (role === "IT_SUPPORT") {
    return [
      { href: "/users", label: "จัดการผู้ใช้งาน", icon: UserCog },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: ShieldCheck },
    ];
  }

  if (role === "HOUSEHOLD") {
    return [
      { href: "/", label: "หน้าหลัก", icon: Home },
      {
        href: "/#household-profile",
        label: "ข้อมูลครัวเรือนของฉัน (เล่มม่วง)",
        icon: Users,
        iconColor: BOOK_ICON_COLOR.households,
      },
      {
        href: "/#debt-history",
        label: "ประวัติหนี้สินของฉัน (เล่มเหลือง)",
        icon: Banknote,
        iconColor: BOOK_ICON_COLOR.loans,
      },
    ];
  }

  return [
    { href: "/", label: "หน้าหลัก", icon: Home },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ...menusForRole(user).map((m) => ({
      href: m.href,
      label: m.title,
      icon: BOOK_ICONS[m.key] ?? FileText,
      iconColor: BOOK_ICON_COLOR[m.key],
    })),
    ...EXTRA_LINKS,
    { href: "/reports/smart", label: "ค้นหา/แผนที่ (Smart Report)", icon: MapPin },
    { href: "/official-reports", label: "แบบรายงานภาวะหนี้สินฯ", icon: BarChart3 },
    ...(hasMinRole(user, "DISTRICT_ADMIN") ? [{ href: "/reports", label: "รายงานราชการ", icon: BarChart3 }] : []),
    ...(isUserManager ? [{ href: "/users", label: "จัดการผู้ใช้งาน", icon: UserCog }] : []),
    ...(hasMinRole(user, "GLOBAL_ADMIN")
      ? [{ href: "/master-data", label: "จัดการพื้นที่ (Master Data)", icon: Settings }]
      : []),
    ...(role === "GLOBAL_ADMIN" ? [{ href: "/admin/audit-logs", label: "Audit Logs", icon: ShieldCheck }] : []),
  ];
}

/** เมนูหลักสำหรับ Bottom Navigation บนมือถือ — จำกัดไม่เกิน 5 รายการที่ใช้บ่อยที่สุด */
export function getPrimaryNavLinks(user: CurrentUser): NavLink[] {
  return getNavLinks(user).slice(0, 5);
}
