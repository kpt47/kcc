"use client";

import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { NearbyPlace, NearbyVillageFund } from "@/lib/fundingSourcesTypes";
import { FUNDING_CATEGORY_LABEL, FUNDING_CATEGORY_COLOR } from "@/lib/fundingSourcesTypes";
import { googleMapsDirectionsUrl } from "@/lib/googleMaps";

function NavigateLink({ lat, lng }: { lat: number; lng: number }) {
  return (
    <a
      href={googleMapsDirectionsUrl(lat, lng)}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-flex min-h-8 items-center gap-1 rounded-full bg-blue-600 px-2.5 text-xs font-semibold text-white"
    >
      นำทาง →
    </a>
  );
}

function pinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="width:20px;height:20px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
}

const HOME_ICON = L.divIcon({
  className: "",
  html: `<div style="width:26px;height:26px;border-radius:9999px;background:#dc2626;border:3px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.5);"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -13],
});

const VILLAGE_FUND_ICON = pinIcon("#7c3aed"); // ม่วง — กองทุนหมู่บ้าน กข.คจ. อื่นในระบบ
const CATEGORY_ICON: Record<string, L.DivIcon> = Object.fromEntries(
  Object.entries(FUNDING_CATEGORY_COLOR).map(([key, color]) => [key, pinIcon(color)])
);

export function FundingSourcesMapInner({
  center,
  villageName,
  radiusKm,
  villageFunds,
  places,
}: {
  center: [number, number];
  villageName: string;
  radiusKm: number;
  villageFunds: NearbyVillageFund[];
  places: NearbyPlace[];
}) {
  const countByCategory = places.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-red-600" />
          หมู่บ้านของคุณ
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-violet-600" />
          กองทุนหมู่บ้าน กข.คจ. อื่นในระบบ ({villageFunds.length})
        </span>
        {(Object.keys(FUNDING_CATEGORY_LABEL) as (keyof typeof FUNDING_CATEGORY_LABEL)[])
          .filter((cat) => countByCategory[cat])
          .map((cat) => (
            <span key={cat} className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: FUNDING_CATEGORY_COLOR[cat] }} />
              {FUNDING_CATEGORY_LABEL[cat]} ({countByCategory[cat]})
            </span>
          ))}
      </div>
      {/* isolate กัน z-index ภายในของ Leaflet หลุดออกไปทับ dropdown/เมนูอื่นในหน้าเดียวกัน */}
      <div className="isolate overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800" style={{ height: 480 }}>
        <MapContainer center={center} zoom={9} style={{ height: "100%", width: "100%" }}>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: "#64748b", weight: 1, fillOpacity: 0.03 }} />
          <Marker position={center} icon={HOME_ICON}>
            <Popup>
              <p className="font-bold">{villageName}</p>
              <p className="text-sm">หมู่บ้านของคุณ</p>
            </Popup>
          </Marker>
          {villageFunds.map((v) => (
            <Marker key={`vf-${v.id}`} position={[v.latitude, v.longitude]} icon={VILLAGE_FUND_ICON}>
              <Popup>
                <div className="flex flex-col gap-1">
                  <p className="font-bold">{v.name}</p>
                  <p className="text-sm">กองทุนหมู่บ้าน กข.คจ. — ห่างประมาณ {v.distanceKm} กม.</p>
                  <NavigateLink lat={v.latitude} lng={v.longitude} />
                </div>
              </Popup>
            </Marker>
          ))}
          {places.map((p) => (
            <Marker key={`place-${p.id}`} position={[p.latitude, p.longitude]} icon={CATEGORY_ICON[p.category]}>
              <Popup>
                <div className="flex flex-col gap-1">
                  <p className="font-bold">{p.name}</p>
                  <p className="text-sm">
                    {FUNDING_CATEGORY_LABEL[p.category]} — ห่างประมาณ {p.distanceKm} กม.
                  </p>
                  <NavigateLink lat={p.latitude} lng={p.longitude} />
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
