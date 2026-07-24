"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

// สีเดียวกับที่ใช้ระบายแผนที่ (OverviewReportMapInner.tsx) และหมุดใน SmartReportMapInner.tsx — ให้ความหมาย
// สีตรงกันทั้งแอป (เขียว=ปกติ, เหลือง=เฝ้าระวัง, แดง=เสี่ยงสูง)
const RISK_COLOR: Record<"normal" | "watchlist" | "highRisk", string> = {
  normal: "#059669",
  watchlist: "#ca8a04",
  highRisk: "#e11d48",
};
const RISK_LABEL: Record<"normal" | "watchlist" | "highRisk", string> = {
  normal: "ปกติ",
  watchlist: "เฝ้าระวัง",
  highRisk: "เสี่ยงสูง",
};

/**
 * เปรียบเทียบความเสี่ยงหนี้แบบวงกลม 3 สี (นับจำนวนสัญญา) — แทนที่การ์ดวัดอัตรา NPL แบบวงแหวนเปอร์เซ็นต์เดิม
 * เพราะการนับจำนวนสัญญาเทียบสัดส่วนสีเข้าใจง่ายกว่าสำหรับผู้ใช้ทั่วไปที่ไม่คุ้นกับตัวเลขเปอร์เซ็นต์ — ใช้ทั้งใน
 * Dashboard (สถานะ NPL) และรายงานภาพรวม (แผนที่ระบายสี)
 */
export function RiskPieCard({
  normalCount,
  watchlistCount,
  highRiskCount,
}: {
  normalCount: number;
  watchlistCount: number;
  highRiskCount: number;
}) {
  const total = normalCount + watchlistCount + highRiskCount;
  const data = [
    { key: "normal" as const, value: normalCount },
    { key: "watchlist" as const, value: watchlistCount },
    { key: "highRisk" as const, value: highRiskCount },
  ];

  return (
    <div className="motion-safe:animate-fadeInUp flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 sm:hidden">เปรียบเทียบความเสี่ยงหนี้ (จำนวนสัญญา)</p>
      {total === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">ยังไม่มีสัญญาเงินยืมในพื้นที่ที่กำลังแสดง</p>
      ) : (
        <>
          <div className="hidden text-sm font-semibold text-slate-900 dark:text-slate-100 sm:block sm:w-40 sm:shrink-0">
            เปรียบเทียบความเสี่ยงหนี้
            <br />
            (จำนวนสัญญา)
          </div>
          <div className="h-32 w-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="key" innerRadius={35} outerRadius={60} paddingAngle={2}>
                  {data.map((d) => (
                    <Cell key={d.key} fill={RISK_COLOR[d.key]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} สัญญา`, RISK_LABEL[name as "normal" | "watchlist" | "highRisk"]]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: RISK_COLOR.normal }} />
              ปกติ: {normalCount.toLocaleString("th-TH")} สัญญา
            </span>
            <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: RISK_COLOR.watchlist }} />
              เฝ้าระวัง: {watchlistCount.toLocaleString("th-TH")} สัญญา
            </span>
            <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: RISK_COLOR.highRisk }} />
              เสี่ยงสูง: {highRiskCount.toLocaleString("th-TH")} สัญญา
            </span>
          </div>
        </>
      )}
    </div>
  );
}
