"use client";

import { useEffect, useRef, useState } from "react";

/** นับเลขวิ่งขึ้นจาก 0 ถึง target แบบ ease-out — ข้ามอนิเมชันทันทีถ้าผู้ใช้ตั้งค่า prefers-reduced-motion */
export function useCountUp(target: number, durationMs = 700, enabled = true): number {
  const [value, setValue] = useState(enabled ? 0 : target);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setValue(target);
      return;
    }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    startRef.current = null;
    let raf: number;
    const step = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs, enabled]);

  return value;
}
