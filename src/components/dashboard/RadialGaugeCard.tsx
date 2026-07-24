"use client";

import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { useChartTheme } from "./useChartTheme";

const TONE_COLOR: Record<"default" | "warn" | "good", string> = {
  default: "#0ea5e9",
  warn: "#dc2626",
  good: "#059669",
};

/** การ์ด KPI แบบวงแหวนสัดส่วน — ใช้กับ KPI ที่เป็น % ล้วนๆ (อัตรา NPL, % ความครบถ้วนกองทุน ฯลฯ) */
export function RadialGaugeCard({
  label,
  percent,
  tone = "default",
  hint,
}: {
  label: string;
  percent: number; // 0-100+ (ค่าเกิน 100 จะถูก clamp เฉพาะตอนวาดวงแหวน แต่ตัวเลขกลางวงแสดงค่าจริง)
  tone?: "default" | "warn" | "good";
  hint?: string;
}) {
  const chartTheme = useChartTheme();
  const color = TONE_COLOR[tone];
  const clamped = Math.max(0, Math.min(100, percent));
  const data = [{ v: clamped, fill: color }];

  return (
    <div className="motion-safe:animate-fadeInUp flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="relative h-16 w-16 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={90} endAngle={90 - 3.6 * clamped} barSize={7}>
            <RadialBar dataKey="v" cornerRadius={4} isAnimationActive={false} background={{ fill: chartTheme.grid }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-900 dark:text-slate-100">
          {percent.toFixed(1)}%
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}
