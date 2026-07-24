"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { FundingSourcesNearbyResponse } from "@/lib/fundingSourcesTypes";

// Leaflet ต้องใช้ window/document — ปิด SSR สำหรับ component นี้เสมอ (แพทเทิร์นเดียวกับ SmartReportMap.tsx)
const FundingSourcesMapInner = dynamic(() => import("./FundingSourcesMapInner").then((m) => m.FundingSourcesMapInner), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
      กำลังโหลดแผนที่...
    </div>
  ),
});

export function FundingSourcesMap() {
  const [data, setData] = useState<FundingSourcesNearbyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/funding-sources/nearby")
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => null);
          throw new Error(body?.error?.formErrors?.[0] ?? "โหลดข้อมูลไม่สำเร็จ");
        }
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <p className="rounded-2xl border border-dashed border-rose-300 p-6 text-center text-sm text-rose-600 dark:border-rose-800 dark:text-rose-400">
        {error}
      </p>
    );
  }

  if (!data) {
    return (
      <div className="flex h-[480px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
        กำลังโหลดข้อมูลแหล่งทุนใกล้เคียง...
      </div>
    );
  }

  if (!data.hasCoordinates) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        หมู่บ้านของคุณ (&quot;{data.villageName}&quot;) ยังไม่ได้ตั้งพิกัดในระบบ — แจ้งผู้ดูแลระบบให้ตั้งพิกัดที่หน้า
        &quot;จัดการพื้นที่ (Master Data)&quot; เพื่อให้แผนที่แสดงแหล่งทุนใกล้เคียงได้
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <FundingSourcesMapInner
        center={[data.center.latitude, data.center.longitude]}
        villageName={data.villageName}
        radiusKm={data.radiusKm}
        villageFunds={data.villageFunds}
        places={data.places}
      />
      {data.placesUnavailable && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          ⚠ ไม่สามารถโหลดข้อมูลแหล่งทุนจากแผนที่ออนไลน์ได้ในขณะนี้ — ลองรีเฟรชหน้าใหม่อีกครั้ง
        </p>
      )}
    </div>
  );
}
