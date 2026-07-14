"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

// ครอบ next-themes ไว้เป็น Client Component แยกต่างหาก เพราะ RootLayout (src/app/layout.tsx) เป็น
// async Server Component เรียก ThemeProvider ของ next-themes ตรงๆ ไม่ได้ (ต้องมี "use client" boundary)
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
