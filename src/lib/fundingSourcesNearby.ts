import { prisma } from "@/lib/prisma";
import { distanceKm } from "@/lib/geo";
import type { FundingSourceCategory, NearbyPlace, NearbyVillageFund } from "@/lib/fundingSourcesTypes";

export const FUNDING_RADIUS_KM = 40;
const OVERPASS_TIMEOUT_MS = 12_000;
// mirror สำรอง — overpass-api.de บล็อก IP บางช่วงของผู้ให้บริการ cloud/datacenter อยู่บ่อยครั้ง (พบระหว่างพัฒนา
// ระบบนี้เอง) จึงลองอันดับแรกก่อน แล้วสลับไป mirror สำรองถ้าเรียกไม่สำเร็จ ทั้งสองเป็นบริการสาธารณะไม่ต้องใช้ API key
const OVERPASS_ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

// คำค้นชื่อสถานที่ภาษาไทยสำหรับหมวดแหล่งทุน/สถาบันการเงินชุมชนที่ OSM ไม่มี tag มาตรฐานแยกให้ — จับคู่จากชื่อ
// สถานที่แทน (regex, case-insensitive) ครอบคลุม: กองทุนพัฒนาบทบาทสตรี, กองทุนแม่ของแผ่นดิน, กข.คจ.,
// สถาบันการเงินชุมชน, ศูนย์จัดการกองทุนชุมชน, สหกรณ์ (ออมทรัพย์/การเกษตร), วิสาหกิจชุมชน, โอทอป/OTOP
const NAME_KEYWORDS =
  "กองทุน|สหกรณ์|วิสาหกิจชุมชน|โอทอป|OTOP|สถาบันการเงินชุมชน|ศูนย์จัดการกองทุนชุมชน|กข\\.?คจ";

function categorizePlace(tags: Record<string, string>): FundingSourceCategory {
  const name = tags.name ?? "";
  if (tags.amenity === "bank") return "bank";
  if (tags.amenity === "marketplace") return "market";
  if (tags.office === "cooperative" || /สหกรณ์/.test(name)) return "cooperative";
  if (/โอทอป|otop/i.test(name)) return "otop";
  if (/วิสาหกิจชุมชน/.test(name)) return "enterprise";
  if (/กองทุน|สถาบันการเงินชุมชน|ศูนย์จัดการกองทุน|กข\.?คจ/i.test(name)) return "community_fund";
  return "other";
}

async function queryOverpass(query: string): Promise<Response | null> {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: query,
        signal: controller.signal,
      });
      if (res.ok) return res;
    } catch {
      // ลอง endpoint ถัดไป
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

// ดึงแหล่งทุน/สถาบันการเงินใกล้พิกัดที่กำหนดจาก Overpass API (ข้อมูลเปิดของ OpenStreetMap ไม่ต้องใช้ API key)
// ครอบคลุมทั้ง tag มาตรฐาน (ธนาคาร/ตลาดนัด/สหกรณ์) และค้นชื่อสถานที่ที่มีคำเฉพาะของไทย (กองทุน/วิสาหกิจชุมชน/
// โอทอป ฯลฯ) เพราะไม่มี tag มาตรฐานแยกให้ในไทย — ลองสอง mirror ก่อนถือว่าใช้ไม่ได้ (ดู queryOverpass)
export async function fetchNearbyPlaces(lat: number, lng: number): Promise<{ places: NearbyPlace[]; unavailable: boolean }> {
  const r = FUNDING_RADIUS_KM * 1000;
  const query = `[out:json][timeout:10];(
    node["amenity"="bank"](around:${r},${lat},${lng});
    way["amenity"="bank"](around:${r},${lat},${lng});
    node["amenity"="marketplace"](around:${r},${lat},${lng});
    way["amenity"="marketplace"](around:${r},${lat},${lng});
    node["office"="cooperative"](around:${r},${lat},${lng});
    way["office"="cooperative"](around:${r},${lat},${lng});
    node["name"~"${NAME_KEYWORDS}",i](around:${r},${lat},${lng});
    way["name"~"${NAME_KEYWORDS}",i](around:${r},${lat},${lng});
  );out center 300;`;

  try {
    const res = await queryOverpass(query);
    if (!res) return { places: [], unavailable: true };
    const data = await res.json();
    const elements: { id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] =
      data.elements ?? [];
    const places: NearbyPlace[] = elements
      .map((el) => {
        const elLat = el.lat ?? el.center?.lat;
        const elLng = el.lon ?? el.center?.lon;
        if (elLat == null || elLng == null) return null;
        const tags = el.tags ?? {};
        return {
          id: `${el.type}/${el.id}`,
          name: tags.name || tags.brand || "ไม่ระบุชื่อ",
          category: categorizePlace(tags),
          distanceKm: Math.round(distanceKm(lat, lng, elLat, elLng) * 10) / 10,
          latitude: elLat,
          longitude: elLng,
        };
      })
      .filter((b): b is NearbyPlace => b !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 200);
    return { places, unavailable: false };
  } catch {
    return { places: [], unavailable: true };
  }
}

// หมุด "กองทุนหมู่บ้าน กข.คจ." อื่นๆ ในระบบที่ตั้งพิกัดไว้แล้ว — ไม่ต้องพึ่ง API ภายนอกเลย เพราะระบบนี้เก็บ
// พิกัดหมู่บ้านของตัวเองอยู่แล้ว (ดู VillageManager/VillageLocationPicker) จึงนำมาใช้ซ้ำได้ทันที
export async function findNearbyVillageFunds(lat: number, lng: number, excludeVillageId: number): Promise<NearbyVillageFund[]> {
  const villages = await prisma.village.findMany({
    where: { id: { not: excludeVillageId }, latitude: { not: null }, longitude: { not: null } },
    select: { id: true, villageName: true, villageNo: true, latitude: true, longitude: true },
  });
  return villages
    .map((v) => ({
      id: v.id,
      name: `หมู่ ${v.villageNo} บ้าน${v.villageName}`,
      distanceKm: Math.round(distanceKm(lat, lng, v.latitude!, v.longitude!) * 10) / 10,
      latitude: v.latitude!,
      longitude: v.longitude!,
    }))
    .filter((v) => v.distanceKm <= FUNDING_RADIUS_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
