"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartCard } from "./ChartCard";
import { useChartTheme } from "./useChartTheme";

const COLORS = ["#059669", "#f59e0b", "#0ea5e9", "#ef4444", "#8b5cf6"];

export function PieChartCard({
  title,
  subtitle,
  filename,
  data,
}: {
  title: string;
  subtitle?: string;
  filename: string;
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const chartTheme = useChartTheme();

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      filename={filename}
      excelRows={() => data.map((d) => ({ รายการ: d.name, จำนวนเงิน: d.value }))}
    >
      {total <= 0 ? (
        <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">ยังไม่มีข้อมูลสำหรับแสดงกราฟ</p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => `${Number(value).toLocaleString("th-TH")} บาท`}
                contentStyle={{ background: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, borderRadius: 8 }}
                itemStyle={{ color: chartTheme.tooltipText }}
                labelStyle={{ color: chartTheme.tooltipText }}
              />
              <Legend wrapperStyle={{ color: chartTheme.legendText }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
