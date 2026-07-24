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
  Briefcase,
  MessageCircle,
  PieChart,
  BarChart3,
  UserCog,
  Settings,
  ShieldCheck,
  Info,
  Lightbulb,
  NotebookPen,
  Map,
  BookOpen,
  FolderOpen,
  Search,
  Shield,
  HandCoins,
} from "lucide-react";
import { menusForRole } from "./dashboard";
import { hasMinRole, canViewAuditLog, canViewStatisticsDashboard } from "./authz";
import type { CurrentUser } from "./auth";

export type NavLink = { href: string; label: string; icon: LucideIcon; iconColor?: string; group?: string };

// ป้ายหัวข้อคั่นกลุ่มเมนู (แสดงเฉพาะเมื่อมีมากกว่า 1 กลุ่มปรากฏอยู่จริงในรายการ — ดู withSectionHeaders)
export const NAV_GROUP_LABELS: Record<string, string> = {
  books: "สมุดบัญชี 4 เล่ม",
  forms: "แบบฟอร์มและเอกสาร",
  reports: "รายงานและค้นหา",
  admin: "ผู้ดูแลระบบ",
};

export type NavListItem = { type: "link"; link: NavLink } | { type: "header"; label: string; group: string };

// ไอคอน+สีของ "หัวข้อคั่นกลุ่ม" เอง (คนละชุดกับ BOOK_ICON_COLOR ที่เป็นสีของลิงก์ย่อยแต่ละอัน) — เลือกให้ต่างจาก
// ไอคอน/สีของลิงก์ย่อยในกลุ่มเดียวกัน เพื่อไม่ให้สับสนว่าอันไหนคือหัวข้อคั่น แสดงเป็นแถบพื้นสี (banner) ให้เด่น
// แยกจากรายการเมนูด้านล่างชัดเจน ไม่ใช่แค่ตัวอักษรสีเฉยๆ
export const NAV_GROUP_STYLE: Record<string, { icon: LucideIcon; text: string; bg: string }> = {
  books: { icon: BookOpen, text: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-950/40" },
  forms: { icon: FolderOpen, text: "text-cyan-700 dark:text-cyan-300", bg: "bg-cyan-50 dark:bg-cyan-950/40" },
  reports: { icon: Search, text: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-950/40" },
  admin: { icon: Shield, text: "text-indigo-700 dark:text-indigo-300", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
};

/**
 * แปลง NavLink[] แบบเรียบให้มีหัวข้อคั่นกลุ่มแทรกอยู่ด้วย — ถ้ามีแค่กลุ่มเดียว (หรือไม่มีกลุ่มเลย เช่น
 * เมนู HOUSEHOLD/IT_SUPPORT ที่สั้นอยู่แล้ว) จะไม่แสดงหัวข้อใดๆ เลย เพื่อไม่ให้เพิ่มความรกโดยไม่จำเป็น
 * ใช้ร่วมกันทั้ง Sidebar.tsx (เดสก์ท็อป) และ TopNav.tsx (เมนู Hamburger มือถือ)
 */
export function withSectionHeaders(links: NavLink[]): NavListItem[] {
  const distinctGroups = new Set(links.map((l) => l.group).filter(Boolean));
  if (distinctGroups.size <= 1) return links.map((link) => ({ type: "link", link }));

  const result: NavListItem[] = [];
  let lastGroup: string | undefined;
  for (const link of links) {
    if (link.group && link.group !== lastGroup) {
      result.push({ type: "header", label: NAV_GROUP_LABELS[link.group] ?? link.group, group: link.group });
    }
    lastGroup = link.group;
    result.push({ type: "link", link });
  }
  return result;
}

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
        href: "/proposals",
        label: "แบบเสนอโครงการ",
        icon: FileText,
        iconColor: "text-indigo-600 dark:text-indigo-300",
      },
      {
        href: "/loan-requests",
        label: "แบบขอยืมเงินทุน",
        icon: HandCoins,
        iconColor: "text-amber-600 dark:text-amber-300",
      },
      {
        href: "/household-profile",
        label: "ข้อมูลครัวเรือนของฉัน (เล่มม่วง)",
        icon: Users,
        iconColor: BOOK_ICON_COLOR.households,
      },
      {
        href: "/debt-history",
        label: "ประวัติหนี้สินของฉัน (เล่มเหลือง)",
        icon: Banknote,
        iconColor: BOOK_ICON_COLOR.loans,
      },
      {
        href: "/career-ideas",
        label: "แนะนำอาชีพ!",
        icon: Lightbulb,
        iconColor: "text-amber-600 dark:text-amber-300",
      },
      {
        href: "/funding-sources",
        label: "แหล่งทุนใกล้ฉัน",
        icon: MapPin,
        iconColor: "text-sky-600 dark:text-sky-300",
      },
      {
        href: "/side-jobs",
        label: "งานเสริมเพิ่มรายได้",
        icon: Briefcase,
        iconColor: "text-emerald-600 dark:text-emerald-300",
      },
      {
        href: "/household-inquiries",
        label: "ปรึกษา/ร้องทุกข์",
        icon: MessageCircle,
        iconColor: "text-rose-600 dark:text-rose-300",
      },
    ];
  }

  return [
    { href: "/", label: "หน้าหลัก", icon: Home },
    { href: "/overview-report", label: "Dashboard", icon: Map },
    { href: "/dashboard", label: "รายงานการเงิน", icon: LayoutDashboard },
    // เฉพาะส่วนกลาง/พัฒนาการจังหวัด/พัฒนาการอำเภอ/พัฒนากรตำบล — ต้องตรงกับ lib/authz.ts: canViewStatisticsDashboard เป๊ะ
    ...(canViewStatisticsDashboard(user) ? [{ href: "/statistics", label: "ข้อมูลสถิติ", icon: PieChart }] : []),
    ...menusForRole(user).map((m) => ({
      href: m.href,
      label: m.title,
      icon: BOOK_ICONS[m.key] ?? FileText,
      iconColor: BOOK_ICON_COLOR[m.key],
      group: "books",
    })),
    ...EXTRA_LINKS.map((l) => ({ ...l, group: "forms" })),
    // เฉพาะพัฒนากรตำบล/ผู้บริหารอำเภอ/ผู้บริหารจังหวัด — ต้องตรงกับ lib/authz.ts: canViewVillageStatusBook เป๊ะ
    ...(role === "SUB_DISTRICT_ADMIN" || role === "DISTRICT_ADMIN" || role === "PROVINCIAL_ADMIN"
      ? [
          {
            href: "/visit-logs",
            label: "บันทึกการติดตามและข้อแนะนำ",
            icon: NotebookPen,
            iconColor: "text-sky-600 dark:text-sky-300",
            group: "forms",
          },
        ]
      : []),
    { href: "/reports/smart", label: "วิเคราะห์ข้อมูล", icon: MapPin, group: "reports" },
    { href: "/official-reports", label: "แบบรายงานภาวะหนี้สินฯ", icon: BarChart3, group: "reports" },
    ...(isUserManager ? [{ href: "/users", label: "จัดการผู้ใช้งาน", icon: UserCog, group: "admin" }] : []),
    ...(hasMinRole(user, "GLOBAL_ADMIN")
      ? [{ href: "/master-data", label: "จัดการพื้นที่ (หมู่บ้าน)", icon: Settings, group: "admin" }]
      : []),
    ...(canViewAuditLog(user)
      ? [{ href: "/admin/audit-logs", label: "Audit Logs", icon: ShieldCheck, group: "admin" }]
      : []),
    // เฉพาะผู้บริหารอำเภอ/ผู้บริหารจังหวัด — ต้องตรงกับ lib/authz.ts: canViewHouseholdInquiries เป๊ะ
    ...(role === "DISTRICT_ADMIN" || role === "PROVINCIAL_ADMIN"
      ? [
          {
            href: "/admin/household-inquiries",
            label: "ปรึกษา/ร้องทุกข์",
            icon: MessageCircle,
            iconColor: "text-rose-600 dark:text-rose-300",
            group: "admin",
          },
        ]
      : []),
    { href: "/about-program", label: "เกี่ยวกับโปรแกรม", icon: Info, group: "admin" },
  ];
}

/** เมนูหลักสำหรับ Bottom Navigation บนมือถือ — จำกัดไม่เกิน 5 รายการที่ใช้บ่อยที่สุด */
export function getPrimaryNavLinks(user: CurrentUser): NavLink[] {
  return getNavLinks(user).slice(0, 5);
}
