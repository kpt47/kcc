"use client";

import { useCountUp } from "@/lib/useCountUp";

/** แสดงตัวเลขนับวิ่งขึ้นตอน mount — รับค่าดิบ (number) + ฟังก์ชัน format เพื่อรองรับหน่วย/สัญลักษณ์ต่างๆ */
export function CountUpValue({
  target,
  format,
  className,
}: {
  target: number;
  format: (n: number) => string;
  className?: string;
}) {
  const value = useCountUp(target);
  return <span className={className}>{format(value)}</span>;
}
