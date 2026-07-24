"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RiskPieCard } from "@/components/dashboard/RiskPieCard";
import type { AreaLevel, OverviewRegionRow } from "@/lib/analytics";

const OverviewReportMapInner = dynamic(() => import("./OverviewReportMapInner").then((m) => m.OverviewReportMapInner), {
  ssr: false,
  loading: () => (
    <div className="flex h-[520px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
      กำลังโหลดแผนที่...
    </div>
  ),
});

type ChoroplethLevel = Exclude<AreaLevel, "village">;

const LEVEL_LABEL: Record<ChoroplethLevel, string> = { province: "จังหวัด", district: "อำเภอ", subDistrict: "ตำบล" };

export type Crumb = { code: string; name: string };

/** ระดับปัจจุบันคำนวณจากความลึกของ breadcrumb เสมอ (single source of truth) — 0 ชั้น = จังหวัด,
 *  1 ชั้น = อำเภอ (ลูกของ breadcrumb ชั้นสุดท้าย), 2 ชั้น = ตำบล ป้องกันบั๊ก level/parentCode ไม่ตรงกับ breadcrumb */
function levelForDepth(depth: number): ChoroplethLevel {
  if (depth <= 0) return "province";
  if (depth === 1) return "district";
  return "subDistrict";
}

/** เลือกไฟล์ GeoJSON แบบ static ตาม level/parentCode — ไฟล์แบ่งไว้แล้วตอน import (ดู scripts/importAdminBoundaries.mjs) */
function geoJsonUrl(level: ChoroplethLevel, parentCode?: string): string {
  if (level === "province") return "/geo/provinces.geojson";
  if (level === "district") return `/geo/districts/${parentCode}.geojson`;
  return `/geo/subdistricts/${parentCode}.geojson`;
}

function money(n: number): string {
  return `${Math.round(n).toLocaleString("th-TH")} บาท`;
}

export function OverviewReportMap({ initialBreadcrumb }: { initialBreadcrumb: Crumb[] }) {
  const rootDepth = initialBreadcrumb.length;
  const [breadcrumb, setBreadcrumb] = useState<Crumb[]>(initialBreadcrumb);
  const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [rows, setRows] = useState<OverviewRegionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // กัน drill-down ซ้อนระหว่างที่ยังโหลดข้อมูลระดับใหม่ไม่เสร็จ (เช่น คลิกรัว/ดับเบิลคลิก) ไม่ให้ข้ามระดับ
  const loadingRef = useRef(false);

  const level = levelForDepth(breadcrumb.length);
  const parentCode = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].code : undefined;

  useEffect(() => {
    setGeoJson(null);
    setRows(null);
    setError(null);
    loadingRef.current = true;
    const params = new URLSearchParams({ level });
    if (parentCode) params.set("parentCode", parentCode);

    Promise.all([
      fetch(geoJsonUrl(level, parentCode)).then((r) => {
        if (!r.ok) throw new Error("ไม่พบข้อมูลเส้นเขตสำหรับพื้นที่นี้");
        return r.json();
      }),
      fetch(`/api/overview-report/regions?${params.toString()}`).then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => null);
          throw new Error(body?.error?.formErrors?.[0] ?? "โหลดข้อมูลไม่สำเร็จ");
        }
        return r.json();
      }),
    ])
      .then(([gj, data]) => {
        setGeoJson(gj);
        setRows(data.rows ?? []);
        loadingRef.current = false;
      })
      .catch((e) => {
        setError(e.message);
        loadingRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, parentCode]);

  function handleDrillDown(code: string) {
    if (loadingRef.current) return; // กำลังโหลดระดับก่อนหน้าอยู่ ไม่รับคลิกซ้อน
    if (level === "subDistrict") return; // ตำบลเป็นระดับลึกที่สุดของแผนที่นี้แล้ว
    const row = rows?.find((r) => r.code === code);
    if (!row) return;
    setBreadcrumb((b) => [...b, { code, name: row.name }]);
  }

  /** ตัด breadcrumb ให้เหลือ `depth` ชั้น — ไม่ให้ต่ำกว่าขอบเขตเริ่มต้นของผู้ใช้ (rootDepth) */
  function goToDepth(depth: number) {
    setBreadcrumb((b) => b.slice(0, Math.max(depth, rootDepth)));
  }

  const canGoBack = breadcrumb.length > rootDepth;

  // สรุปตัวเลข KPI จากพื้นที่ที่แสดงอยู่บนแผนที่ตอนนี้เท่านั้น (เปลี่ยนตามการคลิก/ซูมของแผนที่) — ไม่ใช่ยอดรวม
  // ทั้งขอบเขตสิทธิ์แบบตายตัวอีกต่อไป ตามที่ตั้นต้องการให้ตัวเลขไล่ตามพื้นที่ที่เลือกดูบนแผนที่
  const summary = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const totalVillages = rows.reduce((s, r) => s + r.totalVillages, 0);
    const totalHouseholds = rows.reduce((s, r) => s + r.totalHouseholds, 0);
    const totalOutstanding = rows.reduce((s, r) => s + r.outstandingBalance, 0);
    const normalCount = rows.reduce((s, r) => s + r.normalCount, 0);
    const watchlistCount = rows.reduce((s, r) => s + r.watchlistCount, 0);
    const highRiskCount = rows.reduce((s, r) => s + r.highRiskCount, 0);
    const incomeWeighted = rows.reduce((s, r) => s + r.avgIncomeBeforeLoan * r.totalHouseholds, 0);
    return {
      totalVillages,
      totalHouseholds,
      totalOutstanding,
      normalCount,
      watchlistCount,
      highRiskCount,
      avgIncomeBeforeLoan: totalHouseholds > 0 ? incomeWeighted / totalHouseholds : 0,
    };
  }, [rows]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="จำนวนหมู่บ้าน" value={summary ? `${summary.totalVillages.toLocaleString("th-TH")} แห่ง` : "…"} icon="villages" />
        <KpiCard label="จำนวนครัวเรือนเป้าหมาย" value={summary ? `${summary.totalHouseholds.toLocaleString("th-TH")} ครัวเรือน` : "…"} icon="households" />
        <KpiCard label="ยอดหนี้คงค้างรวม" value={summary ? money(summary.totalOutstanding) : "…"} icon="debt" />
        <KpiCard
          label="รายได้เฉลี่ยก่อนกู้"
          value={summary ? money(summary.avgIncomeBeforeLoan) : "…"}
          icon="fund"
          hint="เฉลี่ยต่อครัวเรือน จากข้อมูล จปฐ. ที่บันทึกไว้ก่อนยืมเงิน — เฉพาะพื้นที่ที่กำลังแสดงบนแผนที่"
        />
      </div>

      {summary && (
        <RiskPieCard normalCount={summary.normalCount} watchlistCount={summary.watchlistCount} highRiskCount={summary.highRiskCount} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-900 dark:text-slate-100">ระดับ{LEVEL_LABEL[level]}</span>
          {breadcrumb.length > 0 && (
            <>
              <span>—</span>
              {breadcrumb.map((c, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span>/</span>}
                  <button type="button" onClick={() => goToDepth(i + 1)} className="min-h-8 rounded px-1 hover:underline">
                    {c.name}
                  </button>
                </span>
              ))}
            </>
          )}
        </div>
        {canGoBack && (
          <button
            type="button"
            onClick={() => goToDepth(breadcrumb.length - 1)}
            className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ← ย้อนกลับ
          </button>
        )}
      </div>

      {error ? (
        <p className="rounded-2xl border border-dashed border-rose-300 p-6 text-center text-sm text-rose-600 dark:border-rose-800 dark:text-rose-400">
          {error}
        </p>
      ) : !geoJson || !rows ? (
        <div className="flex h-[520px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
          กำลังโหลดข้อมูล...
        </div>
      ) : (
        <OverviewReportMapInner geoJson={geoJson} rows={rows} onDrillDown={handleDrillDown} />
      )}
      <p className="text-xs text-slate-400 dark:text-slate-500">คลิกที่พื้นที่บนแผนที่เพื่อดูข้อมูลลึกขึ้นอีกระดับ (จังหวัด → อำเภอ → ตำบล)</p>
    </div>
  );
}
