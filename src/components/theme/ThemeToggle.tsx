"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

// ปุ่มสลับโหมดสี Light/Dark (ค่าเริ่มต้น "system" ตาม OS ของผู้ใช้ — คลิกเพื่อสลับเป็นโหมดที่เจาะจงเอง)
// ต้องรอให้ mount ฝั่ง client ก่อนค่อยแสดงไอคอนจริง (resolvedTheme ไม่รู้ค่าจนกว่า client จะ hydrate เสร็จ)
// เพื่อไม่ให้ HTML จาก server กับ client ไม่ตรงกัน (Hydration Mismatch)
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={`h-9 w-9 ${className}`} aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
      title={isDark ? "โหมดสว่าง (Light Mode)" : "โหมดมืด (Dark Mode)"}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 ${className}`}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
