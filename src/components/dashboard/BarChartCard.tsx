"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "./ChartCard";

export function BarChartCard({
  title,
  subtitle,
  filename,
  data,
  xKey,
  yKey,
  yLabel,
  color = "#059669",
}: {
  title: string;
  subtitle?: string;
  filename: string;
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  yLabel: string;
  color?: string;
}) {
  const hasData = data.some((d) => Number(d[yKey]) > 0);

  return (
    <ChartCard title={title} subtitle={subtitle} filename={filename} excelRows={() => data}>
      {!hasData ? (
        <p className="py-10 text-center text-sm text-slate-400">ยังไม่มีข้อมูลสำหรับแสดงกราฟ</p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v: number) => v.toLocaleString("th-TH")} />
              <Tooltip formatter={(value) => [`${Number(value).toLocaleString("th-TH")} บาท`, yLabel]} />
              <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
