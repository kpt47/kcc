"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "./ChartCard";
import { useChartTheme } from "./useChartTheme";

export function LineChartCard({
  title,
  subtitle,
  filename,
  data,
  xKey,
  yKey,
  yLabel,
  color = "#0ea5e9",
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
  const chartTheme = useChartTheme();

  return (
    <ChartCard title={title} subtitle={subtitle} filename={filename} excelRows={() => data}>
      {!hasData ? (
        <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">ยังไม่มีข้อมูลรายได้เพียงพอสำหรับแสดงแนวโน้ม</p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: chartTheme.axis }} />
              <YAxis
                tick={{ fontSize: 11, fill: chartTheme.axis }}
                width={70}
                tickFormatter={(v: number) => v.toLocaleString("th-TH")}
              />
              <Tooltip
                formatter={(value) => [`${Number(value).toLocaleString("th-TH")} บาท/คน/ปี`, yLabel]}
                contentStyle={{ background: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, borderRadius: 8 }}
                itemStyle={{ color: chartTheme.tooltipText }}
                labelStyle={{ color: chartTheme.tooltipText }}
              />
              <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
