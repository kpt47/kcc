import { prisma } from "@/lib/prisma";
import { distanceKm } from "@/lib/geo";
import type { FundingSourceCategory, NearbyPlace, NearbyVillageFund } from "@/lib/fundingSourcesTypes";

export const FUNDING_RADIUS_KM = 40;
// เวลาที่ยอมให้แต่ละ endpoint ตอบกลับ: คิวรีตาม tag มาตรฐาน (bank/marketplace/cooperative) เร็วมาก
// (พบว่าตอบภายใน 1-2 วินาทีเสมอ เพราะ Overpass ใช้ index ของ tag ได้) จึงตั้งสั้นได้ ส่วนคิวรีค้นชื่อ
// ด้วย regex (ดู NAME_QUERY ด้านล่าง) ช้ากว่ามากและเวลาแปรผัน (วัดได้ 8-24+ วินาทีตามโหลดเซิร์ฟเวอร์
// สาธารณะขณะนั้น บางครั้งไม่ตอบเลยจนครบเวลา) เพราะ Overpass ไม่มี index ให้ค้น "name" ด้วย regex — สองคิวรีนี้
// ยิงขนานกัน (ดู fetchNearbyPlaces) เวลารวมจึงเท่ากับคิวรีที่ช้าที่สุด ไม่ใช่ผลรวมของทั้งสอง และคุมไม่ให้เกิน
// maxDuration ของ route (ดู page.tsx/route.ts) โดยจำกัดจำนวน mirror ที่คิวรีชื่อจะลองด้วย (ดู NAME_ENDPOINTS)
const OVERPASS_TAG_TIMEOUT_MS = 6_000;
const OVERPASS_NAME_TIMEOUT_MS = 13_000;
// mirror สำรอง — เรียงตามความเสถียรที่ตรวจสอบจริง (ก.ค. 2569): overpass-api.de และ overpass.kumi.systems
// บล็อก/timeout กับ IP ของผู้ให้บริการ cloud/datacenter อยู่บ่อยครั้ง (พบระหว่างพัฒนาระบบนี้เอง) จึงย้ายมาไว้
// ลำดับท้ายและขึ้น overpass.openstreetmap.fr กับ maps.mail.ru ที่ตอบสนองได้จริงจาก sandbox/เซิร์ฟเวอร์ไว้ก่อน
// ทั้งหมดเป็นบริการสาธารณะไม่ต้องใช้ API key — ลองไล่ตามลำดับจนกว่าจะสำเร็จ (ดู queryOverpass)
const OVERPASS_ENDPOINTS = [
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
// คิวรีค้นชื่อ (ช้ากว่ามาก) จำกัดให้ลองแค่ 2 mirror แรกที่เสถียรที่สุด แทนที่จะไล่ครบทั้ง 4 เหมือนคิวรี tag —
// เพื่อคุมเวลารอสูงสุดของคิวรีนี้ไม่ให้เกิน ~26 วินาที (2 มิเรอร์ x 13s) ให้พอดีกับ maxDuration=30s ของทั้ง
// route (คิวรี tag วิ่งขนานกันอยู่แล้ว ไม่ได้บวกเพิ่ม — ดู Promise.all ใน fetchNearbyPlaces)
const NAME_ENDPOINTS = OVERPASS_ENDPOINTS.slice(0, 2);

// คำค้นชื่อสถานที่ภาษาไทยสำหรับหมวดแหล่งทุน/สถาบันการเงินชุมชนที่ OSM ไม่มี tag มาตรฐานแยกให้ — จับคู่จากชื่อ
// สถานที่แทน ครอบคลุม: กองทุนพัฒนาบทบาทสตรี, กองทุนแม่ของแผ่นดิน, กข.คจ., สถาบันการเงินชุมชน,
// ศูนย์จัดการกองทุนชุมชน, สหกรณ์ (ออมทรัพย์/การเกษตร), วิสาหกิจชุมชน, โอทอป, ธนาคารอิสลามแห่งประเทศไทย
// (ไม่ใส่ flag ",i" เพราะภาษาไทยไม่มีตัวพิมพ์เล็ก-ใหญ่อยู่แล้ว และวัดจริงพบว่า flag ",i" ทำให้ Overpass
// ช้าขึ้นเกือบ 3 เท่าโดยไม่จำเป็น — ดูรายละเอียดที่ NAME_TIMEOUT ด้านบน)
const THAI_NAME_KEYWORDS =
  "กองทุน|สหกรณ์|วิสาหกิจชุมชน|โอทอป|สถาบันการเงินชุมชน|ศูนย์จัดการกองทุนชุมชน|กข\\.?คจ|ธนาคารอิสลาม|อิสลามแห่งประเทศไทย";
// คำค้นภาษาอังกฤษ (OTOP/ibank/Islamic Bank) ต้องรองรับได้ทั้งตัวพิมพ์เล็ก-ใหญ่ แต่หลีกเลี่ยง flag ",i" ที่ทำให้
// Overpass ช้าลงมาก โดยสะกดทีละตัวอักษรเป็น character class แทน (ตรงกับทุก case โดยไม่ต้องพึ่ง flag)
const LATIN_NAME_KEYWORDS = "[Oo][Tt][Oo][Pp]|[Ii][Bb][Aa][Nn][Kk]|[Ii]slamic\\s?[Bb]ank";

// ชื่อ/คำเรียกธนาคารอิสลามแห่งประเทศไทย (ไอแบงก์) ที่พบใน OSM — แยกออกมาจาก "bank" ทั่วไป เพื่อให้จับคู่กับ
// การ์ด "ธนาคารอิสลามแห่งประเทศไทย" ในหมวด "แหล่งทุนอื่นๆ ที่น่าสนใจ" ได้ตรงหมวดจริงๆ ไม่ปนกับธนาคารทั่วไป
// (ใช้ตรวจสอบฝั่ง JS ไม่ใช่ใน query ที่ส่งไป Overpass จึงใส่ flag "i" ได้ตามปกติ ไม่มีผลด้านประสิทธิภาพ) —
// คำว่า "ibank"/"islamic bank" ต้อง anchor ด้วย \b เพราะ "ibank" ล้วนๆ ไปตรงกับส่วนหนึ่งของ "Citibank" ด้วย
// (พบจากการทดสอบจริงกับข้อมูล OSM ย่านกรุงเทพฯ — c-i-t-[i-b-a-n-k])
const ISLAMIC_BANK_KEYWORDS = "ธนาคารอิสลาม|อิสลามแห่งประเทศไทย|\\bibank\\b|\\bislamic\\s*bank\\b";

function categorizePlace(tags: Record<string, string>): FundingSourceCategory {
  const name = tags.name ?? "";
  if (tags.amenity === "bank") {
    return new RegExp(ISLAMIC_BANK_KEYWORDS, "i").test(name) ? "islamic_bank" : "bank";
  }
  if (tags.amenity === "marketplace") return "market";
  if (tags.office === "cooperative" || /สหกรณ์/.test(name)) return "cooperative";
  if (/โอทอป|otop/i.test(name)) return "otop";
  if (/วิสาหกิจชุมชน/.test(name)) return "enterprise";
  if (/กองทุน|สถาบันการเงินชุมชน|ศูนย์จัดการกองทุน|กข\.?คจ/i.test(name)) return "community_fund";
  return "other";
}

async function queryOverpass(query: string, timeoutMs: number, endpoints: string[]): Promise<Response | null> {
  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
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

type OverpassElement = {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function elementsToPlaces(elements: OverpassElement[], lat: number, lng: number): NearbyPlace[] {
  return elements
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
    .filter((b): b is NearbyPlace => b !== null);
}

// ดึงแหล่งทุน/สถาบันการเงินใกล้พิกัดที่กำหนดจาก Overpass API (ข้อมูลเปิดของ OpenStreetMap ไม่ต้องใช้ API key)
// แยกเป็น 2 คิวรีที่ยิง "ขนานกัน" (ไม่ใช่รวมเป็นคิวรีเดียว): (1) ตาม tag มาตรฐาน (ธนาคาร/ตลาดนัด/สหกรณ์) —
// เร็วมากเพราะ Overpass ใช้ index ของ tag ได้ (2) ค้นชื่อสถานที่ด้วย regex (กองทุน/วิสาหกิจชุมชน/โอทอป/
// ธนาคารอิสลาม ฯลฯ) — ช้ากว่ามากเพราะไม่มี tag มาตรฐานแยกให้ในไทย ต้องสแกนชื่อแทน จึงต้องให้เวลามากกว่า
// และไม่ปล่อยให้ทำให้คิวรีแรก (ซึ่งควรเร็ว) ต้องรอไปด้วย ถ้าคิวรีที่ 2 ล้มเหลว/timeout จะยังคงแสดงผลจาก
// คิวรีแรกตามปกติ (ไม่ถือว่า "ใช้งานไม่ได้" ทั้งหมด) — จะถือว่า unavailable ก็ต่อเมื่อทั้งสองคิวรีล้มเหลว
export async function fetchNearbyPlaces(lat: number, lng: number): Promise<{ places: NearbyPlace[]; unavailable: boolean }> {
  const r = FUNDING_RADIUS_KM * 1000;
  const tagQuery = `[out:json][timeout:9];(
    node["amenity"="bank"](around:${r},${lat},${lng});
    way["amenity"="bank"](around:${r},${lat},${lng});
    node["amenity"="marketplace"](around:${r},${lat},${lng});
    way["amenity"="marketplace"](around:${r},${lat},${lng});
    node["office"="cooperative"](around:${r},${lat},${lng});
    way["office"="cooperative"](around:${r},${lat},${lng});
  );out center 300;`;
  const nameQuery = `[out:json][timeout:18];(
    node["name"~"${THAI_NAME_KEYWORDS}"](around:${r},${lat},${lng});
    way["name"~"${THAI_NAME_KEYWORDS}"](around:${r},${lat},${lng});
    node["name"~"${LATIN_NAME_KEYWORDS}"](around:${r},${lat},${lng});
    way["name"~"${LATIN_NAME_KEYWORDS}"](around:${r},${lat},${lng});
  );out center 300;`;

  const [tagResult, nameResult] = await Promise.all([
    queryOverpass(tagQuery, OVERPASS_TAG_TIMEOUT_MS, OVERPASS_ENDPOINTS)
      .then((res) => res?.json())
      .catch(() => null),
    queryOverpass(nameQuery, OVERPASS_NAME_TIMEOUT_MS, NAME_ENDPOINTS)
      .then((res) => res?.json())
      .catch(() => null),
  ]);

  if (!tagResult && !nameResult) return { places: [], unavailable: true };

  const elements: OverpassElement[] = [...(tagResult?.elements ?? []), ...(nameResult?.elements ?? [])];
  const seen = new Set<string>();
  const places = elementsToPlaces(elements, lat, lng)
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 200);
  return { places, unavailable: false };
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
