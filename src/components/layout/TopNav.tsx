"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { getNavLinks, withSectionHeaders, NAV_GROUP_STYLE } from "@/lib/navLinks";
import { BRAND, BRAND_ALT } from "@/lib/branding";
import type { CurrentUser } from "@/lib/auth";

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6" aria-hidden>
      <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6" aria-hidden>
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

// แถบหัวข้อสำหรับหน้าจอมือถือ/แท็บเล็ตขนาดเล็กเท่านั้น (ต่ำกว่า md) — บนเดสก์ท็อป/แท็บเล็ตขนาดใหญ่
// ใช้ Sidebar.tsx แทน (แสดงตลอดเวลาด้านข้าง ไม่ต้องกดเปิด) ดู AppShell.tsx สำหรับการสลับ layout
export function TopNav({ user }: { user: CurrentUser }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const links = getNavLinks(user);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-slate-800 dark:bg-slate-900/95 dark:supports-[backdrop-filter]:bg-slate-900/80 md:hidden">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-sm font-bold text-blue-800 dark:text-blue-400">
          <img src={BRAND.programLogo} alt={BRAND_ALT.programLogo} className="h-7 w-7 rounded-full" />
          <span>ระบบ กข.คจ.</span>
        </Link>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <NotificationBell />
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-700 dark:text-slate-300"
            aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>
      </div>

      {/* แผงเมนูแบบ Toggle — ซ่อนตัวอัตโนมัติเมื่อกดเลือกเมนูแล้ว
          pb-16 กันไม่ให้แถวสุดท้าย (เปลี่ยนรหัสผ่าน/ออกจากระบบ) โดน BottomNav (fixed, z-20 เท่ากัน แต่อยู่หลังใน DOM
          จึงวาดทับ) บังไว้เมื่อรายการเมนูยาวจนเกินความสูงจอ (เกิดกับ role ที่มีเมนูเยอะ เช่น GLOBAL_ADMIN) */}
      {open && (
        <nav className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-slate-200 bg-white px-4 py-3 pb-16 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-1">
            {withSectionHeaders(links).map((item, idx) => {
              if (item.type === "header") {
                const style = NAV_GROUP_STYLE[item.group];
                const HeaderIcon = style?.icon;
                return (
                  <p
                    key={`header-${item.label}-${idx}`}
                    className={`mt-4 mb-1.5 flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide first:mt-0 ${
                      style ? `${style.bg} ${style.text}` : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {HeaderIcon && <HeaderIcon className="h-4 w-4 shrink-0" />}
                    <span>{item.label}</span>
                  </p>
                );
              }
              const l = item.link;
              const active = pathname === l.href;
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium ${
                    active
                      ? "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 ${
                      l.iconColor ?? (active ? "text-blue-700 dark:text-blue-400" : "text-slate-400 dark:text-slate-500")
                    }`}
                  />
                  {l.label}
                </Link>
              );
            })}
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
              <span className="truncate text-sm text-slate-500 dark:text-slate-400">{user.displayName}</span>
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="min-h-11 rounded-lg px-3 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
              >
                การตั้งค่าผู้ใช้งาน
              </Link>
              <LogoutButton />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
