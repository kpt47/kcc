"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Layer, PathOptions } from "leaflet";
import type { Feature } from "geojson";
import { regionRiskTier } from "@/lib/debtRisk";
import type { OverviewRegionRow } from "@/lib/analytics";

// สีตามระดับความเสี่ยงหนี้ — ใช้ค่าเดียวกับ RISK_COLOR ใน SmartReportMapInner.tsx เพื่อให้ความหมายสีตรงกัน
// ทั้งแอป (เขียว=ปกติ, เหลือง=เฝ้าระวัง, แดง=เสี่ยงสูง) ไม่ใช่สเกลไล่สีน้ำเงินแบบ quantile เหมือนเดิมแล้ว
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
const NO_DATA_COLOR = "#cbd5e1";

export function OverviewReportMapInner({
  geoJson,
  rows,
  onDrillDown,
}: {
  geoJson: GeoJSON.FeatureCollection;
  rows: OverviewRegionRow[];
  onDrillDown: (code: string) => void;
}) {
  const rowsByCode = useMemo(() => new Map(rows.map((r) => [r.code, r])), [rows]);

  // ใช้ bounds (กรอบพิกัดครอบคลุมทุก feature) แทน center+zoom คงที่ — เพื่อให้แผนที่ซูม/เลื่อนไปยังพื้นที่ที่
  // กำลังแสดงอยู่จริงโดยอัตโนมัติทุกครั้งที่ drill ระดับ (MapContainer remount ใหม่ทุกครั้งด้วย key ด้านล่าง)
  const bounds = useMemo<[[number, number], [number, number]]>(() => {
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    for (const f of geoJson.features) {
      for (const [lng, lat] of collectCoords(f)) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      }
    }
    if (minLat > maxLat) return [[5.6, 97.3], [20.5, 105.6]]; // ค่าเริ่มต้น: ครอบคลุมประเทศไทยทั้งหมด
    return [[minLat, minLng], [maxLat, maxLng]];
  }, [geoJson]);

  function style(feature?: Feature): PathOptions {
    const code = feature?.properties?.code as string | undefined;
    const row = code ? rowsByCode.get(code) : undefined;
    const color = row ? RISK_COLOR[regionRiskTier(row.normalCount, row.watchlistCount, row.highRiskCount)] : NO_DATA_COLOR;
    return { fillColor: color, fillOpacity: row ? 0.75 : 0.3, color: "#475569", weight: 1 };
  }

  function onEachFeature(feature: Feature, layer: Layer) {
    const code = feature.properties?.code as string | undefined;
    const nameTh = feature.properties?.nameTh as string | undefined;
    const row = code ? rowsByCode.get(code) : undefined;
    const totalLoans = row ? row.normalCount + row.watchlistCount + row.highRiskCount : 0;
    const tooltipHtml = !row
      ? `<b>${nameTh ?? ""}</b><br/>ไม่มีข้อมูล (นอกขอบเขตสิทธิ์ของคุณ)`
      : `<b>${nameTh ?? row.name}</b><br/>` +
        `สถานะความเสี่ยง: <b>${RISK_LABEL[regionRiskTier(row.normalCount, row.watchlistCount, row.highRiskCount)]}</b><br/>` +
        `สัญญา: ปกติ ${row.normalCount} • เฝ้าระวัง ${row.watchlistCount} • เสี่ยงสูง ${row.highRiskCount} (จาก ${totalLoans} สัญญา)<br/>` +
        `จำนวนครัวเรือน: ${row.totalHouseholds.toLocaleString("th-TH")} ครัวเรือน<br/>` +
        `ยอดหนี้คงค้างรวม: ${row.outstandingBalance.toLocaleString("th-TH")} บาท`;
    layer.bindTooltip(tooltipHtml, { sticky: true });
    if (row && code) {
      layer.on("click", () => onDrillDown(code));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
        <span className="font-semibold">สีพื้นที่ = ระดับความเสี่ยงหนี้ (นับจากจำนวนสัญญา):</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full" style={{ background: RISK_COLOR.normal }} />ปกติ</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full" style={{ background: RISK_COLOR.watchlist }} />เฝ้าระวัง</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full" style={{ background: RISK_COLOR.highRisk }} />เสี่ยงสูง</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full" style={{ background: NO_DATA_COLOR }} />ไม่มีข้อมูล</span>
      </div>
      {/* isolate กัน z-index ภายในของ Leaflet หลุดออกไปทับ dropdown/เมนูอื่นในหน้าเดียวกัน */}
      <div className="isolate overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800" style={{ height: 520 }}>
        <MapContainer
          key={JSON.stringify(geoJson.features.map((f) => f.properties?.code))}
          bounds={bounds}
          boundsOptions={{ padding: [20, 20] }}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <GeoJSON data={geoJson} style={style} onEachFeature={onEachFeature} />
        </MapContainer>
      </div>
    </div>
  );
}

function collectCoords(feature: Feature): [number, number][] {
  const geom = feature.geometry;
  if (!geom) return [];
  if (geom.type === "Polygon") return geom.coordinates.flat() as [number, number][];
  if (geom.type === "MultiPolygon") return geom.coordinates.flat(2) as [number, number][];
  return [];
}
