"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ค่าเดียวกับ GOVERNMENT_FUND_PRINCIPAL ใน src/lib/analytics.ts — คัดลอกมาไว้ที่นี่ (ไม่ import ตรงๆ)
// เพราะไฟล์นี้เป็น Client Component ส่วน analytics.ts import prisma ซึ่งเป็นโค้ดฝั่งเซิร์ฟเวอร์เท่านั้น
const GOVERNMENT_FUND_PRINCIPAL = 280_000;

export type VillageMapSummary = {
  id: number;
  villageName: string;
  latitude: number;
  longitude: number;
  riskStatus: "NORMAL" | "WATCHLIST" | "HIGH_RISK";
  totalLoaned: number;
  bankBalance: number;
  overduePercent: number;
  requiredFund: number;
  currentFund: number;
  fundShortfall: number;
  fundAtRisk: boolean;
};

const RISK_COLOR: Record<string, string> = { NORMAL: "#059669", WATCHLIST: "#ca8a04", HIGH_RISK: "#e11d48" };
const RISK_LABEL: Record<string, string> = { NORMAL: "ดี", WATCHLIST: "เฝ้าระวัง", HIGH_RISK: "เสี่ยงสูง" };

// สีเติมหมุด = สถานะ NPL (หนี้ค้างชำระ) เหมือนเดิม ส่วน "เงินทุนหาย" เป็นความเสี่ยงคนละมิติกัน (เงินต้นทุน
// รัฐบาลขาดหายจากระบบจริง ไม่ใช่แค่อยู่ระหว่างให้ยืม) จึงใช้กรอบประประสีแดงล้อมรอบเพิ่ม ไม่ปนกับสีเติมเดิม
function markerIcon(riskStatus: string, fundAtRisk: boolean): L.DivIcon {
  const color = RISK_COLOR[riskStatus] ?? RISK_COLOR.NORMAL;
  const ring = fundAtRisk
    ? `<div style="position:absolute;inset:-6px;border-radius:9999px;border:3px dashed #dc2626;"></div>`
    : "";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:22px;height:22px;">${ring}<div style="width:22px;height:22px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div></div>`,
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
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
        <span className="font-semibold">สีหมุด = สถานะหนี้ค้างชำระ:</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full" style={{ background: RISK_COLOR.NORMAL }} />ดี</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full" style={{ background: RISK_COLOR.WATCHLIST }} />เฝ้าระวัง</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full" style={{ background: RISK_COLOR.HIGH_RISK }} />เสี่ยงสูง</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-dashed border-red-600" />
          กรอบประแดง = เงินทุนต้นทุนต่ำกว่าเกณฑ์ {GOVERNMENT_FUND_PRINCIPAL.toLocaleString("th-TH")} บาท (เสี่ยงเงินทุนหาย)
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200" style={{ height: 480 }}>
        <MapContainer center={center} zoom={villages.length > 0 ? 10 : 6} style={{ height: "100%", width: "100%" }}>
          <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {villages.map((v) => (
            <Marker key={v.id} position={[v.latitude, v.longitude]} icon={markerIcon(v.riskStatus, v.fundAtRisk)}>
              <Popup>
                <div className="flex flex-col gap-1 text-sm">
                  <p className="font-bold">{v.villageName}</p>
                  <p>สถานะหนี้เสียภาพรวม: {RISK_LABEL[v.riskStatus]}</p>
                  <p>ยอดเงินให้ยืม: {v.totalLoaned.toLocaleString("th-TH")} บาท</p>
                  <p>ยอดเงินฝากบัญชีธนาคาร: {v.bankBalance.toLocaleString("th-TH")} บาท</p>
                  <p>% หนี้ค้างชำระ: {v.overduePercent.toFixed(1)}%</p>
                  <hr className="my-1 border-slate-200" />
                  <p>เงินทุนรวมปัจจุบัน: {v.currentFund.toLocaleString("th-TH")} บาท</p>
                  <p>เงินทุนต้นทุนที่ต้องมี: {v.requiredFund.toLocaleString("th-TH")} บาท</p>
                  {v.fundAtRisk ? (
                    <p className="font-bold text-red-600">
                      ⚠ เสี่ยงเงินทุนหาย — ขาดอยู่ {v.fundShortfall.toLocaleString("th-TH")} บาท
                    </p>
                  ) : (
                    <p className="text-emerald-700">✓ เงินทุนครบตามเกณฑ์</p>
                  )}
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
    </div>
  );
}
