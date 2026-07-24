"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * Recharts ไม่ theme อัตโนมัติ (สีเป็น prop/CSS ล้วนๆ) — hook นี้คืนชุดสีให้ chart card ต่างๆ ใช้ร่วมกัน
 * ต้องมี `mounted` guard เพราะ resolvedTheme เป็น undefined ตอน render ฝั่ง server/paint แรก มิเช่นนั้นจะ
 * hydration mismatch — ค่าเริ่มต้นก่อน mount จึงล็อกเป็นโหมดสว่างเสมอ (ตรงกับที่ next-themes แนะนำ)
 */
export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";

  return {
    dark,
    grid: dark ? "#334155" : "#e2e8f0",
    axis: dark ? "#94a3b8" : "#64748b",
    tooltipBg: dark ? "#1e293b" : "#ffffff",
    tooltipBorder: dark ? "#334155" : "#e2e8f0",
    tooltipText: dark ? "#e2e8f0" : "#0f172a",
    legendText: dark ? "#cbd5e1" : "#475569",
  };
}
