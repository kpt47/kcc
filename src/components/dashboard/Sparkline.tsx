"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

/** กราฟแนวโน้มจิ๋วไม่มีแกน/tooltip สำหรับฝังในการ์ด KPI — ไม่ animate เพราะมักโชว์หลายอันพร้อมกันในกริดเดียว */
export function Sparkline({ data, color = "#0ea5e9", className = "h-8 w-16" }: { data: number[]; color?: string; className?: string }) {
  if (data.length === 0) return null;
  const points = data.map((v) => ({ v }));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={color} fillOpacity={0.15} isAnimationActive={false} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
