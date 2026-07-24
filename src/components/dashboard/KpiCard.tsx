"use client";

import {
  Banknote,
  Building2,
  Landmark,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { CountUpValue } from "./CountUpValue";
import { Sparkline } from "./Sparkline";

export type KpiIconKey = "villages" | "households" | "debt" | "fund" | "bank" | "cash" | "debtors" | "npl" | "normal" | "risk";

// map จาก string key เป็น component ภายในไฟล์นี้เท่านั้น — ห้ามรับ LucideIcon เป็น prop ตรงๆ เพราะ KpiCard
// เป็น client component แล้ว (สำหรับ count-up/fade-in) การส่ง component reference ข้าม server→client
// prop จะ serialize ไม่ได้ (ต่างจาก MenuCard.tsx ที่ไม่ใช่ client component จึงส่ง THEMES[...].icon ตรงได้)
const ICONS: Record<KpiIconKey, LucideIcon> = {
  villages: Building2,
  households: Users,
  debt: TrendingDown,
  fund: Landmark,
  bank: Wallet,
  cash: Banknote,
  debtors: Users,
  npl: ShieldAlert,
  normal: ShieldCheck,
  risk: ShieldAlert,
};

const TONE_STYLES: Record<
  "default" | "warn" | "good",
  { cardBg: string; cardBorder: string; iconBg: string; iconColor: string; valueColor: string; sparklineColor: string }
> = {
  default: {
    cardBg: "bg-white dark:bg-slate-900",
    cardBorder: "border-slate-200 dark:border-slate-800",
    iconBg: "bg-slate-100 dark:bg-slate-800",
    iconColor: "text-slate-600 dark:text-slate-300",
    valueColor: "text-slate-900 dark:text-slate-100",
    sparklineColor: "#0ea5e9",
  },
  warn: {
    cardBg: "bg-amber-50/60 dark:bg-amber-950/20",
    cardBorder: "border-amber-200 dark:border-amber-900",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    iconColor: "text-amber-700 dark:text-amber-300",
    valueColor: "text-amber-700 dark:text-amber-400",
    sparklineColor: "#d97706",
  },
  good: {
    cardBg: "bg-emerald-50/60 dark:bg-emerald-950/20",
    cardBorder: "border-emerald-200 dark:border-emerald-900",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    iconColor: "text-emerald-700 dark:text-emerald-300",
    valueColor: "text-emerald-700 dark:text-emerald-400",
    sparklineColor: "#059669",
  },
};

export function KpiCard({
  label,
  value,
  tone = "default",
  hint,
  icon,
  trend,
}: {
  label: string;
  /** ส่ง string = ค่าที่ format มาแล้ว แสดงทันทีไม่มีอนิเมชัน (ของเดิม, backward compatible ทุกจุดที่เรียกอยู่แล้ว)
   *  ส่ง number = จะนับเลขวิ่งขึ้นให้อัตโนมัติ ต้องส่ง `format` คู่กันเพื่อแปลงเป็นข้อความ */
  value: string | { numeric: number; format: (n: number) => string };
  tone?: "default" | "warn" | "good";
  hint?: string;
  icon?: KpiIconKey;
  /** ข้อมูลแนวโน้ม (ไม่บังคับ) — แสดง sparkline จิ๋วใต้ตัวเลข ใช้กับ KPI ที่มีข้อมูลย้อนหลังอยู่แล้วเท่านั้น */
  trend?: number[];
}) {
  const styles = TONE_STYLES[tone];
  const Icon = icon ? ICONS[icon] : null;

  return (
    <div
      className={`motion-safe:animate-fadeInUp rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${styles.cardBg} ${styles.cardBorder}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        {Icon && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${styles.iconBg}`}>
            <Icon className={`h-4 w-4 ${styles.iconColor}`} aria-hidden />
          </span>
        )}
      </div>
      <p className={`mt-1 text-xl font-bold sm:text-2xl ${styles.valueColor}`}>
        {typeof value === "string" ? value : <CountUpValue target={value.numeric} format={value.format} />}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      {trend && trend.length > 1 && (
        <div className="mt-2">
          <Sparkline data={trend} color={styles.sparklineColor} className="h-8 w-full" />
        </div>
      )}
    </div>
  );
}
