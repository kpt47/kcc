"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/dashboard/LogoutButton";

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function ProfileMenu({ displayName }: { displayName: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="ml-2 flex min-h-11 max-w-[10rem] items-center gap-1 rounded-full px-2 text-xs text-slate-500 hover:bg-slate-100"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="max-w-[8rem] truncate">{displayName}</span>
        <ChevronIcon />
      </button>

      {open && (
        // เปิดขึ้นด้านบน (bottom-full) แทนด้านล่าง (mt-*) เพราะปุ่มนี้อยู่ที่แถบท้าย Sidebar ติดขอบล่างสุดของจอเสมอ
        // ถ้าเปิดลงด้านล่างแบบเดิมเมนูจะเลยขอบจอลงไป มองไม่เห็น/กดไม่ได้เลย (พบจากการทดสอบจริงที่จอความสูงจำกัด)
        // ยึดขอบซ้าย (left-0) แทนขอบขวา เพราะปุ่มอยู่ชิดขอบซ้ายสุดของแถบ ถ้ายึดขอบขวากางออกทางซ้ายจะล้นขอบจอซ้าย
        <div className="absolute bottom-full left-0 z-30 mb-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block min-h-11 px-4 py-2.5 text-sm font-medium leading-6 text-slate-700 hover:bg-slate-50"
          >
            การตั้งค่าผู้ใช้งาน
          </Link>
          <div className="border-t border-slate-100 px-3 py-2">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
}
