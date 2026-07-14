"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { VillageMapSummary } from "./SmartReportMapInner";

// Leaflet ต้องใช้ window/document — ปิด SSR สำหรับ component นี้เสมอ
const SmartReportMapInner = dynamic(() => import("./SmartReportMapInner").then((m) => m.SmartReportMapInner), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-400">
      กำลังโหลดแผนที่...
    </div>
  ),
});

export function SmartReportMap({ onDrillDown }: { onDrillDown: (villageId: number) => void }) {
  const [villages, setVillages] = useState<VillageMapSummary[] | null>(null);

  useEffect(() => {
    fetch("/api/search/villages/map")
      .then((r) => r.json())
      .then(setVillages)
      .catch(() => setVillages([]));
  }, []);

  if (!villages) {
    return (
      <div className="flex h-[480px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-400">
        กำลังโหลดข้อมูลหมู่บ้าน...
      </div>
    );
  }

  if (villages.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        ยังไม่มีหมู่บ้านที่ตั้งพิกัด (ละติจูด/ลองจิจูด) ในขอบเขตของคุณ — ผู้ดูแลระบบส่วนกลางสามารถตั้งพิกัดได้ที่หน้า &quot;จัดการพื้นที่ (Master Data)&quot;
      </p>
    );
  }

  return <SmartReportMapInner villages={villages} onDrillDown={onDrillDown} />;
}
