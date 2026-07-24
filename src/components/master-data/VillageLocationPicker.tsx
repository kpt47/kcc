"use client";

import dynamic from "next/dynamic";

// Leaflet ต้องใช้ window/document — ปิด SSR สำหรับ component นี้เสมอ (แพทเทิร์นเดียวกับ SmartReportMap.tsx)
export const VillageLocationPicker = dynamic(
  () => import("./VillageLocationPickerInner").then((m) => m.VillageLocationPickerInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[220px] items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-400">
        กำลังโหลดแผนที่...
      </div>
    ),
  }
);
