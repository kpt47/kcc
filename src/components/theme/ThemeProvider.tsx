"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

// ครอบ next-themes ไว้เป็น Client Component แยกต่างหาก เพราะ RootLayout (src/app/layout.tsx) เป็น
// async Server Component เรียก ThemeProvider ของ next-themes ตรงๆ ไม่ได้ (ต้องมี "use client" boundary)
// ค่าเริ่มต้นของทั้งแอปคือโหมดสว่างเสมอ (defaultTheme="light", ไม่เปิด enableSystem) — ไม่ตามธีมของระบบปฏิบัติการ
// ผู้ใช้ต้องกดเลือกโหมดมืดเองผ่าน ThemeToggle เท่านั้น ค่าที่เลือกจะถูกจำไว้ (localStorage) สำหรับครั้งถัดไป
//
// forcedTheme: ใช้บังคับธีมของทั้งหน้า (ไม่สนใจค่าที่จำไว้) — RootLayout ส่ง "light" มาตอนยังไม่ได้ล็อกอิน
// (เช่นหน้า /login) เพื่อให้หน้าล็อกอินเป็นโหมดสว่างเสมอ ผู้ใช้เลือกโหมดเองได้หลังเข้าสู่ระบบแล้วเท่านั้น
export function ThemeProvider({ children, forcedTheme }: { children: ReactNode; forcedTheme?: string }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" forcedTheme={forcedTheme}>
      {children}
    </NextThemesProvider>
  );
}
