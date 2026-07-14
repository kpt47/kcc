"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getPrimaryNavLinks } from "@/lib/navLinks";
import type { CurrentUser } from "@/lib/auth";

// Bottom Navigation สำหรับหน้าจอมือถือ (ต่ำกว่า md) — แสดงเมนูหลักที่ใช้บ่อยที่สุดสูงสุด 5 รายการ
// พร้อมไอคอน เพื่อให้กดใช้งานด้วยนิ้วโป้งได้สะดวกกว่าการเปิด Hamburger Menu ทุกครั้ง
export function BottomNav({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const links = getPrimaryNavLinks(user);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 dark:border-slate-800 dark:bg-slate-900/95 dark:supports-[backdrop-filter]:bg-slate-900/90 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {links.map((l) => {
        const active = pathname === l.href;
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-medium ${
              active ? "text-blue-700 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <Icon
              className={`h-5 w-5 ${l.iconColor ?? (active ? "text-blue-700 dark:text-blue-400" : "text-slate-500 dark:text-slate-400")}`}
            />
            <span className="w-full truncate text-center leading-tight">{l.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
