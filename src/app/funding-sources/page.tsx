import { ExternalLink, MapPin, Navigation } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { FundingSourcesMap } from "@/components/funding-sources/FundingSourcesMap";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FUNDING_INFO } from "@/lib/fundingSources";
import { fetchNearbyPlaces } from "@/lib/fundingSourcesNearby";
import type { NearbyPlace } from "@/lib/fundingSourcesTypes";
import { VILLAGE_ADDRESS_INCLUDE, villageAddress } from "@/lib/geo";
import { googleMapsSearchUrl, googleMapsDirectionsUrl } from "@/lib/googleMaps";

// หน้า "แหล่งทุนใกล้ฉัน" — เฉพาะครัวเรือนเป้าหมาย (เข้าถึงได้ผ่านเมนูใน src/lib/navLinks.ts เท่านั้น)
// ส่วนแผนที่ (FundingSourcesMap) ดึงพิกัดจริงของ "กองทุนหมู่บ้าน กข.คจ." อื่นในระบบ (มีอยู่แล้ว ไม่ต้องพึ่ง API
// ภายนอก) + แหล่งทุน/สถาบันการเงินหลายหมวดจาก Overpass API (ข้อมูลเปิดของ OpenStreetMap) ในรัศมี 40 กม.
// รอบหมู่บ้านของครัวเรือน — แต่ละหมุดมีปุ่ม "นำทาง" เปิด Google Maps เพื่อนำทางได้ทันที
// ส่วน "แหล่งทุนอื่นๆ ที่น่าสนใจ" ด้านล่างใช้ผลลัพธ์พิกัดจริงชุดเดียวกัน จับคู่ตาม category ของแต่ละหมวด — ถ้าพบ
// พิกัดจริงใกล้เคียงจะแสดงรายชื่อ+ระยะทาง+ปุ่มนำทางตรง ถ้าไม่พบ (หมวดที่ไม่มีข้อมูลใน OSM ในพื้นที่นั้น) จะ
// fallback ไปปุ่ม "ค้นหาใกล้ฉันใน Google Maps" แทน (เปิดผลค้นหาจริงจากฐานข้อมูลของ Google เอง ไม่ต้องใช้ API key)
export const dynamic = "force-dynamic";
// fetchNearbyPlaces เรียก Overpass API สาธารณะซึ่งอาจช้า (ดูคอมเมนต์ใน lib/fundingSourcesNearby.ts) —
// ให้เวลาเกินค่า default ของ Vercel เหมือน route PDF อื่นๆ ในระบบ
export const maxDuration = 30;

function NearbyPlaceRow({ place }: { place: NearbyPlace }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{place.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">ห่างประมาณ {place.distanceKm} กม.</p>
      </div>
      <a
        href={googleMapsDirectionsUrl(place.latitude, place.longitude)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full bg-blue-600 px-3 text-xs font-semibold text-white"
      >
        <Navigation className="h-3.5 w-3.5 shrink-0" aria-hidden />
        นำทาง
      </a>
    </div>
  );
}

function FundingInfoCard({
  info,
  areaQuery,
  nearbyMatches,
}: {
  info: (typeof FUNDING_INFO)[number];
  areaQuery: string;
  nearbyMatches: NearbyPlace[];
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-base font-bold text-slate-900 dark:text-slate-100">{info.name}</p>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{info.org}</p>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{info.description}</p>

      {nearbyMatches.length > 0 ? (
        <div className="mt-1 flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            พบใกล้เคียงจริง {nearbyMatches.length} แห่ง (ข้อมูลพิกัดจริง)
          </p>
          {nearbyMatches.map((m) => (
            <NearbyPlaceRow key={m.id} place={m} />
          ))}
        </div>
      ) : (
        <div className="mt-1 flex flex-wrap gap-2">
          <a
            href={googleMapsSearchUrl(`${info.name} ใกล้ ${areaQuery}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-blue-600 px-3.5 text-sm font-semibold text-white"
          >
            <Navigation className="h-4 w-4 shrink-0" aria-hidden />
            ค้นหาใกล้ฉันใน Google Maps
          </a>
        </div>
      )}

      <div className="mt-1 flex flex-wrap gap-2">
        <a
          href={info.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-300 px-3.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
        >
          ข้อมูลหน่วยงาน
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
        </a>
      </div>
    </div>
  );
}

export default async function FundingSourcesPage() {
  const user = await requireUser();

  if (!user.householdId) {
    return (
      <PageContainer title="แหล่งทุนใกล้ฉัน" subtitle="ค้นหาแหล่งเงินทุนใกล้บ้านคุณ">
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          บัญชีของคุณยังไม่ได้ผูกกับครัวเรือนเป้าหมายใดในระบบ
        </p>
      </PageContainer>
    );
  }

  const household = await prisma.targetHousehold.findUnique({
    where: { id: user.householdId },
    select: { village: { include: VILLAGE_ADDRESS_INCLUDE } },
  });
  const address = household ? villageAddress(household.village) : null;
  const areaQuery = address ? `ตำบล${address.subDistrictName} อำเภอ${address.districtName} จังหวัด${address.provinceName}` : "";

  const { latitude, longitude } = household?.village ?? {};
  const placeResult = latitude != null && longitude != null ? await fetchNearbyPlaces(latitude, longitude) : null;
  const placesByCategory = new Map<string, NearbyPlace[]>();
  for (const p of placeResult?.places ?? []) {
    const list = placesByCategory.get(p.category) ?? [];
    list.push(p);
    placesByCategory.set(p.category, list);
  }

  return (
    <PageContainer title="แหล่งทุนใกล้ฉัน" subtitle="แหล่งเงินทุนและกองทุนต่างๆ ในรัศมีประมาณ 40 กิโลเมตรรอบหมู่บ้านของคุณ">
      <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950/40">
        <MapPin className="h-6 w-6 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden />
        <p className="text-sm leading-relaxed text-sky-900 dark:text-sky-200">
          หมุดบนแผนที่และรายชื่อในหมวด &quot;แหล่งทุนอื่นๆ ที่น่าสนใจ&quot; ด้านล่างเป็นข้อมูลพิกัดจริงจากแผนที่ออนไลน์ กดปุ่ม &quot;นำทาง&quot;
          เพื่อเปิด Google Maps นำทางได้ทันที — หมวดใดยังไม่พบพิกัดจริงในพื้นที่ของคุณ จะมีปุ่ม &quot;ค้นหาใกล้ฉันใน Google Maps&quot; ให้แทน
        </p>
      </div>

      <FundingSourcesMap />

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">แหล่งทุนอื่นๆ ที่น่าสนใจ</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FUNDING_INFO.map((info) => (
            <FundingInfoCard
              key={info.key}
              info={info}
              areaQuery={areaQuery}
              nearbyMatches={(placesByCategory.get(info.category) ?? []).slice(0, 3)}
            />
          ))}
        </div>
      </section>
    </PageContainer>
  );
}
