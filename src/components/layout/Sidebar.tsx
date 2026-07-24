"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { getNavLinks, groupNavLinks, NAV_GROUP_STYLE, type NavLink } from "@/lib/navLinks";
import { useNavAccordion } from "@/lib/useNavAccordion";
import { BRAND, BRAND_ALT } from "@/lib/branding";
import type { CurrentUser } from "@/lib/auth";

// เมนูด้านข้าง (Sidebar) สำหรับหน้าจอ Desktop/Tablet (md ขึ้นไป) — แสดงตลอดเวลา ไม่ต้องกดเปิด
// ใช้พื้นที่แนวตั้งแทนแนวนอน ทำให้หน้าจอกว้างมีพื้นที่แสดงตารางข้อมูล/การ์ดได้กว้างขึ้นโดยไม่ต้องเลื่อนซ้ายขวา
// รายการเมนู (links) มาจาก getNavLinks(user) ซึ่งกรองตามสิทธิ์ role/committeeRole ไว้ให้แล้วที่จุดเดียว
// (lib/navLinks.ts) — component นี้จึงมีหน้าที่แค่ "วาด" ตามรายการที่กรองมาแล้ว ผสานกับ dark: variant
// ของแต่ละสถานะ (active/inactive) ไปพร้อมกันในคลาสเดียวกัน ไม่ต้องแยกเงื่อนไข role กับ dark mode คนละที่
//
// แต่ละกลุ่มเมนู (สมุดบัญชี 4 เล่ม/แบบฟอร์มและเอกสาร/รายงานและค้นหา/ผู้ดูแลระบบ) แสดงเป็น Accordion พับ/กางได้
// อิสระต่อกัน (ดู lib/useNavAccordion.ts) ค่าเริ่มต้นกางไว้ทุกกลุ่มเหมือนพฤติกรรมเดิม
export function Sidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const links = getNavLinks(user);
  const { ungrouped, groups } = groupNavLinks(links);
  const activeGroup = groups.find((g) => g.links.some((l) => l.href === pathname))?.group ?? null;
  const { openGroup, toggle } = useNavAccordion(activeGroup);

  function renderLink(l: NavLink) {
    const active = pathname === l.href;
    const Icon = l.icon;
    return (
      <li key={l.href}>
        <Link
          href={l.href}
          className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
            active
              ? "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <Icon
            className={`h-5 w-5 shrink-0 ${
              l.iconColor ?? (active ? "text-blue-700 dark:text-blue-400" : "text-slate-400 dark:text-slate-500")
            }`}
          />
          <span className="truncate">{l.label}</span>
        </Link>
      </li>
    );
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <Link href="/" className="flex items-center gap-2 text-base font-bold text-blue-800 dark:text-blue-400">
          <img src={BRAND.programLogo} alt={BRAND_ALT.programLogo} className="h-8 w-8 shrink-0 rounded-full" />
          <span>ระบบ กข.คจ.</span>
        </Link>
        <ThemeToggle />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {ungrouped.map(renderLink)}
          {groups.map((g) => {
            const style = NAV_GROUP_STYLE[g.group];
            const HeaderIcon = style?.icon;
            const isOpen = openGroup === g.group;
            return (
              <li key={g.group} className="mt-4 first:mt-0">
                <button
                  type="button"
                  onClick={() => toggle(g.group)}
                  aria-expanded={isOpen}
                  className={`mb-1.5 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                    style ? `${style.bg} ${style.text}` : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {HeaderIcon && <HeaderIcon className="h-4 w-4 shrink-0" />}
                    <span>{g.label}</span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`}
                  />
                </button>
                {/* เทคนิค grid-template-rows: 0fr -> 1fr ให้ความสูงเลื่อนลื่นโดยไม่ต้องคำนวณความสูงจริงด้วย JS —
                    ลิงก์ยังอยู่ใน DOM ตลอดเวลา (ต่างจากเดิมที่ conditional render) จึงต้องซ่อนด้วย visibility
                    เพิ่มด้วย ไม่ใช่แค่ height:0 เฉยๆ ไม่งั้นยังกด Tab ไปโฟกัสลิงก์ที่พับอยู่ได้ */}
                <div
                  className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <div className={`overflow-hidden ${isOpen ? "visible" : "invisible"}`}>
                    <ul className="flex flex-col gap-1 pt-0.5">{g.links.map(renderLink)}</ul>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-3 dark:border-slate-800">
        <ProfileMenu displayName={user.displayName} />
        <NotificationBell openUpward />
      </div>
    </aside>
  );
}
