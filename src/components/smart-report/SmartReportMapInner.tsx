"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type VillageMapSummary = {
  id: number;
  villageName: string;
  latitude: number;
  longitude: number;
  riskStatus: "NORMAL" | "WATCHLIST" | "HIGH_RISK";
  totalLoaned: number;
  bankBalance: number;
  overduePercent: number;
};

const RISK_COLOR: Record<string, string> = { NORMAL: "#059669", WATCHLIST: "#ca8a04", HIGH_RISK: "#e11d48" };
const RISK_LABEL: Record<string, string> = { NORMAL: "ดี", WATCHLIST: "เฝ้าระวัง", HIGH_RISK: "เสี่ยงสูง" };

function markerIcon(riskStatus: string): L.DivIcon {
  const color = RISK_COLOR[riskStatus] ?? RISK_COLOR.NORMAL;
  return L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  });
}

export function SmartReportMapInner({
  villages,
  onDrillDown,
}: {
  villages: VillageMapSummary[];
  onDrillDown: (villageId: number) => void;
}) {
  const center: [number, number] =
    villages.length > 0
      ? [villages.reduce((s, v) => s + v.latitude, 0) / villages.length, villages.reduce((s, v) => s + v.longitude, 0) / villages.length]
      : [13.7563, 100.5018]; // ค่าเริ่มต้น: กรุงเทพฯ (ใช้เมื่อยังไม่มีหมู่บ้านที่ตั้งพิกัดในขอบเขตของผู้ใช้)

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200" style={{ height: 480 }}>
      <MapContainer center={center} zoom={villages.length > 0 ? 10 : 6} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {villages.map((v) => (
          <Marker key={v.id} position={[v.latitude, v.longitude]} icon={markerIcon(v.riskStatus)}>
            <Popup>
              <div className="flex flex-col gap-1 text-sm">
                <p className="font-bold">{v.villageName}</p>
                <p>สถานะหนี้เสียภาพรวม: {RISK_LABEL[v.riskStatus]}</p>
                <p>ยอดเงินให้ยืม: {v.totalLoaned.toLocaleString("th-TH")} บาท</p>
                <p>ยอดเงินฝากบัญชีธนาคาร: {v.bankBalance.toLocaleString("th-TH")} บาท</p>
                <p>% หนี้ค้างชำระ: {v.overduePercent.toFixed(1)}%</p>
                <button
                  type="button"
                  onClick={() => onDrillDown(v.id)}
                  className="mt-1 min-h-8 rounded-full bg-emerald-600 px-3 text-xs font-semibold text-white"
                >
                  ดูรายละเอียด →
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
