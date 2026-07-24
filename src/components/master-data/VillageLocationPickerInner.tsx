"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [15.87, 100.9925]; // ศูนย์กลางประเทศไทย (ใช้เมื่อยังไม่เคยปักหมุด)
const DEFAULT_ZOOM = 6;
const PINNED_ZOOM = 15;

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:22px;height:22px;border-radius:9999px;background:#059669;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function ClickToPin({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function VillageLocationPickerInner({
  latitude,
  longitude,
  onPick,
}: {
  latitude: number | null;
  longitude: number | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const hasPin = latitude != null && longitude != null;
  const center: [number, number] = hasPin ? [latitude, longitude] : DEFAULT_CENTER;

  // isolate กัน z-index ภายในของ Leaflet (สูงสุด 1000) หลุดออกไปทับ dropdown ของฟอร์ม (AddressCombobox z-50) ที่อยู่ในหน้าเดียวกัน
  return (
    <div className="isolate overflow-hidden rounded-xl border border-slate-300" style={{ height: 220 }}>
      {/* key={hasPin} บังคับให้ MapContainer สร้างใหม่เมื่อพิกัดเปลี่ยนจาก "ยังไม่มี" เป็น "มีแล้ว" (หรือกลับกัน)
          เพื่อให้ center/zoom เริ่มต้นใหม่ถูกต้อง — react-leaflet ไม่รองรับการเปลี่ยน center ผ่าน prop หลัง mount */}
      <MapContainer key={String(hasPin)} center={center} zoom={hasPin ? PINNED_ZOOM : DEFAULT_ZOOM} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickToPin onPick={onPick} />
        {hasPin && <Marker position={[latitude, longitude]} icon={pinIcon} />}
      </MapContainer>
    </div>
  );
}
